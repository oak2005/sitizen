;; Sitizen STX treasury (Clarity 6)
;; Civic tax in STX. Join 50 STX, 60% ops / 40% community.
;; City contract (set once) may skim, amnesty, and pay community.
;; Ops cannot drain community. Pause blocks joins only.

(define-constant CONTRACT-OWNER tx-sender)

;; 50 STX. Clarity amounts are micro-STX.
(define-constant LIVE-JOIN-STX u50000000)
(define-constant OPS-BPS u60)
(define-constant COMMUNITY-BPS u40)
(define-constant BPS u100)
(define-constant PAYOUT-EVERY u20)
(define-constant PAYOUT-BPS u25)
(define-constant PAYOUT-MIN u80000000)
(define-constant SHARE-1 u50)
(define-constant SHARE-2 u30)
(define-constant SHARE-3 u20)

(define-constant ERR-NOT-OWNER (err u100))
(define-constant ERR-PAUSED (err u101))
(define-constant ERR-ALREADY-SEATED (err u102))
(define-constant ERR-NOT-CITY (err u103))
(define-constant ERR-NO-CITY (err u104))
(define-constant ERR-CITY-SET (err u105))
(define-constant ERR-ZERO (err u106))
(define-constant ERR-INSUFFICIENT-OPS (err u107))
(define-constant ERR-NOT-PAYOUT-EPOCH (err u108))
(define-constant ERR-ALREADY-PAID (err u109))
(define-constant ERR-BAD-TOP (err u110))
(define-constant ERR-TRANSFER (err u111))
(define-constant ERR-NOT-DEED (err u112))
(define-constant ERR-NO-DEED (err u113))
(define-constant ERR-DEED-SET (err u114))

(define-data-var ops-pool uint u0)
(define-data-var community-pool uint u0)
(define-data-var human-seats uint u0)
(define-data-var paused bool false)
(define-data-var city-contract (optional principal) none)
(define-data-var deed-contract (optional principal) none)
(define-data-var last-payout-epoch uint u0)

(define-map humans principal bool)

(define-private (only-owner)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (ok true)
  )
)

(define-private (only-city)
  (let ((city (var-get city-contract)))
    (asserts! (is-some city) ERR-NO-CITY)
    (asserts! (or
        (is-eq tx-sender (unwrap! city ERR-NO-CITY))
        (is-eq contract-caller (unwrap! city ERR-NO-CITY))
      )
      ERR-NOT-CITY
    )
    (ok true)
  )
)

(define-private (only-deed-caller)
  (let ((deed (var-get deed-contract)))
    (asserts! (is-some deed) ERR-NO-DEED)
    (asserts! (is-eq contract-caller (unwrap! deed ERR-NO-DEED)) ERR-NOT-DEED)
    (ok true)
  )
)

(define-private (split (amount uint))
  (let ((ops-cut (/ (* amount OPS-BPS) BPS)))
    {
      ops: ops-cut,
      community: (- amount ops-cut)
    }
  )
)

(define-private (credit-split (amount uint))
  (let ((parts (split amount)))
    (var-set ops-pool (+ (var-get ops-pool) (get ops parts)))
    (var-set community-pool (+ (var-get community-pool) (get community parts)))
    parts
  )
)

(define-private (pay (amount uint) (to principal))
  (if (is-eq amount u0)
    (ok true)
    (begin
      (unwrap!
        (as-contract? ((with-stx amount))
          (unwrap! (stx-transfer? amount tx-sender to) ERR-TRANSFER)
        )
        ERR-TRANSFER
      )
      (ok true)
    )
  )
)

;; Deployer sets the Sitizen city principal once. Cannot rotate.
(define-public (set-city-contract (city principal))
  (begin
    (try! (only-owner))
    (asserts! (is-none (var-get city-contract)) ERR-CITY-SET)
    (var-set city-contract (some city))
    (ok true)
  )
)

(define-public (set-deed-contract (deed principal))
  (begin
    (try! (only-owner))
    (asserts! (is-none (var-get deed-contract)) ERR-DEED-SET)
    (var-set deed-contract (some deed))
    (ok true)
  )
)

(define-public (set-paused (value bool))
  (begin
    (try! (only-owner))
    (var-set paused value)
    (ok value)
  )
)

(define-public (join)
  (begin
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (is-none (map-get? humans tx-sender)) ERR-ALREADY-SEATED)
    (try! (stx-transfer? LIVE-JOIN-STX tx-sender current-contract))
    (map-set humans tx-sender true)
    (var-set human-seats (+ (var-get human-seats) u1))
    (ok (credit-split LIVE-JOIN-STX))
  )
)

;; City sends `amount` STX in with this call. Split 60/40 at receipt.
(define-public (credit-skim (amount uint))
  (begin
    (try! (only-city))
    (asserts! (> amount u0) ERR-ZERO)
    (try! (stx-transfer? amount tx-sender current-contract))
    (ok (credit-split amount))
  )
)

;; sz-deed.improve calls this. tx-sender is still the seat owner; contract-caller is the deed.
(define-public (credit-build (amount uint))
  (begin
    (try! (only-deed-caller))
    (asserts! (> amount u0) ERR-ZERO)
    (try! (stx-transfer? amount tx-sender current-contract))
    (ok (credit-split amount))
  )
)

;; City pays `amount` to player from ops only. Community is untouched.
(define-public (amnesty (player principal) (amount uint))
  (begin
    (try! (only-city))
    (asserts! (> amount u0) ERR-ZERO)
    (asserts! (<= amount (var-get ops-pool)) ERR-INSUFFICIENT-OPS)
    (try! (pay amount player))
    (var-set ops-pool (- (var-get ops-pool) amount))
    (ok amount)
  )
)

;; Every 20 epochs. 25% of community, 50/30/20 to top 3. Skip under PAYOUT-MIN.
(define-public (community-payout (epoch uint) (top3 (list 3 principal)))
  (begin
    (try! (only-city))
    (asserts! (is-eq (mod epoch PAYOUT-EVERY) u0) ERR-NOT-PAYOUT-EPOCH)
    (asserts! (> epoch (var-get last-payout-epoch)) ERR-ALREADY-PAID)
    (asserts! (is-eq (len top3) u3) ERR-BAD-TOP)
    (let (
        (p1 (unwrap! (element-at? top3 u0) ERR-BAD-TOP))
        (p2 (unwrap! (element-at? top3 u1) ERR-BAD-TOP))
        (p3 (unwrap! (element-at? top3 u2) ERR-BAD-TOP))
        (pool (var-get community-pool))
      )
      (var-set last-payout-epoch epoch)
      (if (< pool PAYOUT-MIN)
        (ok { skipped: true, paid: u0, first: u0, second: u0, third: u0 })
        (let (
            (pot (/ (* pool PAYOUT-BPS) BPS))
            (a (/ (* pot SHARE-1) BPS))
            (b (/ (* pot SHARE-2) BPS))
            (c (- pot a b))
          )
          (try! (pay a p1))
          (try! (pay b p2))
          (try! (pay c p3))
          (var-set community-pool (- pool pot))
          (ok { skipped: false, paid: pot, first: a, second: b, third: c })
        )
      )
    )
  )
)

(define-read-only (ops-balance)
  (var-get ops-pool)
)

(define-read-only (community-balance)
  (var-get community-pool)
)

(define-read-only (is-human-seat (who principal))
  (default-to false (map-get? humans who))
)

(define-read-only (human-count)
  (var-get human-seats)
)

(define-read-only (get-city-contract)
  (var-get city-contract)
)

(define-read-only (get-deed-contract)
  (var-get deed-contract)
)

(define-read-only (is-paused)
  (var-get paused)
)

(define-read-only (get-last-payout-epoch)
  (var-get last-payout-epoch)
)

(define-read-only (get-join-amount)
  LIVE-JOIN-STX
)
