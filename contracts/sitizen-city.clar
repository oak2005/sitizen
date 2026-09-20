;; Sitizen city (Clarity 6)
;; Founders Square is 40 spaces at genesis. Same square; no extra lane.
;; Districts unlock at 8 / 16 / 24 seated humans. Computers do not count.
;; Epoch: humans commit or timer. A bot cannot block close.
;; Settlement order: claims, then builds, then moves.
;; Civic tax is STX. SITZ never pays rent.

(define-constant CONTRACT-OWNER tx-sender)
(define-constant HUMANS-PER-DISTRICT u8)
(define-constant FOUNDERS-LOOP u40)
(define-constant LOTS-PER-DISTRICT u4)
(define-constant RENT-SKIM-BPS u5)
(define-constant BPS u100)
(define-constant TESTNET-EPOCH-SECS u600)
(define-constant MAINNET-EPOCH-SECS u21600)
(define-constant AMNESTY-STREAK u5)
(define-constant AMNESTY-BPS u30)
(define-constant KIND-PROPERTY u1)
(define-constant KIND-UTILITY u3)

(define-constant ERR-NOT-OWNER (err u400))
(define-constant ERR-NOT-OPS (err u401))
(define-constant ERR-PAUSED (err u402))
(define-constant ERR-NOT-SEAT (err u403))
(define-constant ERR-ALREADY-SEATED (err u404))
(define-constant ERR-EPOCH-OPEN (err u405))
(define-constant ERR-EPOCH-CLOSED (err u406))
(define-constant ERR-TOO-EARLY (err u407))
(define-constant ERR-ALREADY-COMMITTED (err u408))
(define-constant ERR-NOT-ENOUGH-HUMANS (err u409))
(define-constant ERR-BAD-DISTRICT (err u410))
(define-constant ERR-NO-LAND (err u411))
(define-constant ERR-OWNED (err u412))
(define-constant ERR-ALREADY-LANDED (err u413))
(define-constant ERR-MAINNET (err u414))
(define-constant ERR-ZERO (err u415))
(define-constant ERR-SETTLED (err u416))
(define-constant ERR-NOT-HUMAN (err u417))
(define-constant ERR-LIEN (err u418))
(define-constant ERR-UNLOCK (err u419))

(define-data-var ops principal CONTRACT-OWNER)
(define-data-var paused bool false)
(define-data-var mainnet bool false)
(define-data-var epoch-length uint TESTNET-EPOCH-SECS)
(define-data-var epoch uint u0)
(define-data-var epoch-open bool false)
(define-data-var epoch-opened-at uint u0)
(define-data-var settled bool true)
(define-data-var human-seats uint u0)
(define-data-var human-commits uint u0)
(define-data-var districts uint u0)
(define-data-var settle-phase uint u0)

(define-map humans principal bool)
(define-map computers principal bool)
(define-map seats principal bool)
(define-map committed { epoch: uint, who: principal } bool)
(define-map intents { epoch: uint, who: principal }
  { want-claim: bool, build-id: (optional uint) }
)
(define-map last-landed principal { space: uint, epoch: uint })
(define-map landed-this-epoch { epoch: uint, who: principal } bool)
(define-map bot-wait principal bool)
(define-map liens principal uint)
(define-map lien-epoch principal uint)
(define-map in-jail principal bool)

(define-private (only-owner)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (ok true)
  )
)

(define-private (only-ops)
  (begin
    (asserts! (or (is-eq tx-sender CONTRACT-OWNER) (is-eq tx-sender (var-get ops))) ERR-NOT-OPS)
    (ok true)
  )
)

(define-private (now)
  stacks-block-time
)

(define-private (timer-elapsed)
  (>= (now) (+ (var-get epoch-opened-at) (var-get epoch-length)))
)

(define-private (humans-ready)
  (and
    (> (var-get human-seats) u0)
    (is-eq (var-get human-commits) (var-get human-seats))
  )
)

(define-private (is-human (who principal))
  (default-to false (map-get? humans who))
)

(define-private (district-base (n uint))
  (+ FOUNDERS-LOOP (* (- n u1) LOTS-PER-DISTRICT))
)

(define-private (district-price (n uint))
  (+ u420 (* (- n u1) u60))
)

(define-private (current-loop)
  (+ FOUNDERS-LOOP (* (var-get districts) LOTS-PER-DISTRICT))
)

(define-private (unlock-one (id uint) (kind uint) (printed uint) (group uint))
  (begin
    (unwrap! (contract-call? .sz-deed unlock-lot id kind printed group) ERR-UNLOCK)
    (ok true)
  )
)

(define-public (set-ops (who principal))
  (begin
    (try! (only-owner))
    (var-set ops who)
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

(define-public (set-epoch-length (secs uint))
  (begin
    (try! (only-owner))
    (asserts! (not (var-get mainnet)) ERR-MAINNET)
    (asserts! (> secs u0) ERR-ZERO)
    (var-set epoch-length secs)
    (ok secs)
  )
)

(define-public (seal-mainnet)
  (begin
    (try! (only-owner))
    (var-set mainnet true)
    (var-set epoch-length MAINNET-EPOCH-SECS)
    (ok true)
  )
)

(define-public (join)
  (begin
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (is-none (map-get? seats tx-sender)) ERR-ALREADY-SEATED)
    (try! (contract-call? .stx-treasury join))
    (map-set seats tx-sender true)
    (map-set humans tx-sender true)
    (var-set human-seats (+ (var-get human-seats) u1))
    (ok (var-get human-seats))
  )
)

;; Ops registers a computer seat. Does not pay 50 STX. Does not count for districts.
(define-public (register-computer (bot principal))
  (begin
    (try! (only-ops))
    (asserts! (is-none (map-get? seats bot)) ERR-ALREADY-SEATED)
    (map-set seats bot true)
    (map-set computers bot true)
    (ok true)
  )
)

;; Computers may set this. Close does not read it.
(define-public (set-bot-wait (flag bool))
  (begin
    (asserts! (default-to false (map-get? computers tx-sender)) ERR-NOT-SEAT)
    (map-set bot-wait tx-sender flag)
    (ok flag)
  )
)

(define-public (open-epoch)
  (begin
    (asserts! (not (var-get epoch-open)) ERR-EPOCH-OPEN)
    (asserts! (var-get settled) ERR-SETTLED)
    (var-set epoch (+ (var-get epoch) u1))
    (var-set epoch-open true)
    (var-set epoch-opened-at (now))
    (var-set human-commits u0)
    (var-set settled false)
    (var-set settle-phase u0)
    (ok (var-get epoch))
  )
)

(define-public (commit-intent (want-claim bool) (build-id (optional uint)))
  (begin
    (asserts! (var-get epoch-open) ERR-EPOCH-CLOSED)
    (asserts! (default-to false (map-get? seats tx-sender)) ERR-NOT-SEAT)
    (asserts! (is-none (map-get? committed { epoch: (var-get epoch), who: tx-sender })) ERR-ALREADY-COMMITTED)
    (map-set committed { epoch: (var-get epoch), who: tx-sender } true)
    (map-set intents { epoch: (var-get epoch), who: tx-sender }
      { want-claim: want-claim, build-id: build-id }
    )
    (if (is-human tx-sender)
      (begin
        (var-set human-commits (+ (var-get human-commits) u1))
        true
      )
      true
    )
    (ok true)
  )
)

;; Close when the timer is up OR every human has committed.
;; Computers are not waited on. bot-wait is ignored.
(define-public (close-epoch)
  (begin
    (asserts! (var-get epoch-open) ERR-EPOCH-CLOSED)
    (asserts! (or (timer-elapsed) (humans-ready)) ERR-TOO-EARLY)
    (var-set epoch-open false)
    (var-set settle-phase u1)
    (ok (var-get epoch))
  )
)

;; claims (1) then builds (2) then moves (3). Anyone may advance after close.
(define-public (settle)
  (begin
    (asserts! (not (var-get epoch-open)) ERR-EPOCH-OPEN)
    (asserts! (not (var-get settled)) ERR-SETTLED)
    (asserts! (> (var-get epoch) u0) ERR-TOO-EARLY)
    (var-set settle-phase u3)
    (var-set settled true)
    (ok (var-get epoch))
  )
)

;; Pays the SITZ yield vault to deed owners. Civic tax stays STX. Anyone may poke this after epoch 1.
(define-public (drip-sitz)
  (begin
    (asserts! (> (var-get epoch) u0) ERR-TOO-EARLY)
    (contract-call? .circuit-token drip (var-get epoch))
  )
)

;; Record a landing after close (move step). Once per seat per epoch.
(define-public (land (space uint))
  (begin
    (asserts! (not (var-get epoch-open)) ERR-EPOCH-OPEN)
    (asserts! (default-to false (map-get? seats tx-sender)) ERR-NOT-SEAT)
    (asserts! (is-none (map-get? landed-this-epoch { epoch: (var-get epoch), who: tx-sender })) ERR-ALREADY-LANDED)
    (asserts! (< space (current-loop)) ERR-NO-LAND)
    (map-set landed-this-epoch { epoch: (var-get epoch), who: tx-sender } true)
    (map-set last-landed tx-sender { space: space, epoch: (var-get epoch) })
    (ok space)
  )
)

;; Mint SZ-XX for last-landed, only the following epoch, only if still unowned.
(define-public (claim)
  (let (
      (rec (unwrap! (map-get? last-landed tx-sender) ERR-NO-LAND))
      (space (get space rec))
    )
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (is-human tx-sender) ERR-NOT-HUMAN)
    (asserts! (> (var-get epoch) (get epoch rec)) ERR-TOO-EARLY)
    (asserts! (is-none (unwrap-panic (contract-call? .sz-deed get-owner space))) ERR-OWNED)
    (try! (contract-call? .sz-deed mint space tx-sender))
    (map-delete last-landed tx-sender)
    (ok space)
  )
)

;; 5% STX skim to treasury, 95% to landlord. Civic tax, not SITZ.
(define-public (pay-rent (landlord principal) (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO)
    (asserts! (default-to false (map-get? seats tx-sender)) ERR-NOT-SEAT)
    (let (
        (skim (/ (* amount RENT-SKIM-BPS) BPS))
        (net (- amount skim))
      )
      (try! (stx-transfer? net tx-sender landlord))
      (if (> skim u0)
        (begin
          (try! (contract-call? .stx-treasury credit-skim skim))
          true
        )
        true
      )
      (ok { net: net, skim: skim })
    )
  )
)

;; 2.5% of a stated sale in STX to treasury. Player is tx-sender; city is caller.
(define-public (pay-listing-fee (sale-price uint))
  (begin
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (default-to false (map-get? seats tx-sender)) ERR-NOT-SEAT)
    (asserts! (> sale-price u0) ERR-ZERO)
    (let ((fee (/ (* sale-price u25) u1000)))
      (asserts! (> fee u0) ERR-ZERO)
      (try! (contract-call? .stx-treasury credit-skim fee))
      (ok fee)
    )
  )
)

;; Unlocks 3 colour lots then the utility AFTER the row. Same square, no extra lane.
(define-public (open-district (n uint))
  (begin
    (asserts! (is-eq n (+ (var-get districts) u1)) ERR-BAD-DISTRICT)
    (asserts! (>= (var-get human-seats) (* n HUMANS-PER-DISTRICT)) ERR-NOT-ENOUGH-HUMANS)
    (let (
        (base (district-base n))
        (price (district-price n))
        (group (+ u8 n))
      )
      (try! (unlock-one base KIND-PROPERTY price group))
      (try! (unlock-one (+ base u1) KIND-PROPERTY price group))
      (try! (unlock-one (+ base u2) KIND-PROPERTY (+ price u40) group))
      (try! (unlock-one (+ base u3) KIND-UTILITY u150 u0))
      (var-set districts n)
      (ok {
        n: n,
        lots: (list base (+ base u1) (+ base u2) (+ base u3)),
        utility-last: (+ base u3)
      })
    )
  )
)

(define-public (file-lien (player principal) (amount uint))
  (begin
    (try! (only-ops))
    (asserts! (> amount u0) ERR-ZERO)
    (map-set liens player (+ (default-to u0 (map-get? liens player)) amount))
    (if (is-none (map-get? lien-epoch player))
      (map-set lien-epoch player (var-get epoch))
      true
    )
    (map-set in-jail player true)
    (ok (default-to u0 (map-get? liens player)))
  )
)

(define-public (apply-amnesty (player principal))
  (let (
      (lien (default-to u0 (map-get? liens player)))
      (started (default-to (var-get epoch) (map-get? lien-epoch player)))
      (cut (/ (* lien AMNESTY-BPS) BPS))
    )
    (asserts! (>= (- (var-get epoch) started) AMNESTY-STREAK) ERR-TOO-EARLY)
    (asserts! (> cut u0) ERR-LIEN)
    (try! (contract-call? .stx-treasury amnesty player cut))
    (map-set liens player (- lien cut))
    (ok cut)
  )
)

(define-read-only (human-count)
  (var-get human-seats)
)

(define-read-only (district-count)
  (var-get districts)
)

(define-read-only (loop-size)
  (+ FOUNDERS-LOOP (* (var-get districts) LOTS-PER-DISTRICT))
)

(define-read-only (get-epoch)
  (var-get epoch)
)

(define-read-only (is-epoch-open)
  (var-get epoch-open)
)

(define-read-only (get-epoch-length)
  (var-get epoch-length)
)

(define-read-only (is-human-seat (who principal))
  (is-human who)
)

(define-read-only (is-computer (who principal))
  (default-to false (map-get? computers who))
)

(define-read-only (get-last-landed (who principal))
  (map-get? last-landed who)
)

(define-read-only (get-lien (who principal))
  (default-to u0 (map-get? liens who))
)

(define-read-only (is-jailed (who principal))
  (default-to false (map-get? in-jail who))
)

(define-read-only (district-lots (n uint))
  (let ((base (district-base n)))
    (list base (+ base u1) (+ base u2) (+ base u3))
  )
)

(define-read-only (humans-per-district)
  HUMANS-PER-DISTRICT
)
