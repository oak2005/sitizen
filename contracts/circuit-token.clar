;; Sitizen SITZ token (Clarity 6)
;; SIP-010 without impl-trait on testnet.
;; Token tax is SITZ. Civic tax is STX. Two layers, never mixed.
;; SITZ never pays rent. No staking. No SITZ fee to build houses.

;; Mainnet only - uncomment before mainnet deploy:
;; (impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant CONTRACT-OWNER tx-sender)
(define-fungible-token sitz)

(define-constant DECIMALS u6)
(define-constant UNIT u1000000)
(define-constant TOKEN-TAX-BPS u5)
(define-constant YIELD-BPS u40)
(define-constant OPS-BPS u25)
(define-constant COMMUNITY-BPS u20)
(define-constant BPS u100)
(define-constant TOKEN-YIELD-MIN (* u10 UNIT))
(define-constant GENESIS-SUPPLY (* u100000000 UNIT))
(define-constant KIND-PROPERTY u1)

(define-constant ERR-NOT-OWNER (err u300))
(define-constant ERR-NOT-CITY (err u301))
(define-constant ERR-NO-CITY (err u302))
(define-constant ERR-CITY-SET (err u303))
(define-constant ERR-MAINNET (err u304))
(define-constant ERR-GENESIS (err u305))
(define-constant ERR-ZERO (err u306))
(define-constant ERR-TRANSFER (err u307))
(define-constant ERR-ALREADY-DRIP (err u308))
(define-constant ERR-SENDER (err u309))

(define-data-var token-uri (optional (string-utf8 256)) none)
(define-data-var city-contract (optional principal) none)
(define-data-var mainnet bool false)
(define-data-var genesis-done bool false)
(define-data-var yield-vault uint u0)
(define-data-var ops-sitz uint u0)
(define-data-var community-sitz uint u0)
(define-data-var last-drip-epoch uint u0)

(define-constant LOT-IDS (list
  u1 u3 u5 u6 u7 u8 u11 u12 u13 u14 u15
  u16 u17 u18 u21 u22 u23 u25 u26 u27 u28
  u29 u31 u32 u33 u35 u37 u39
))

(define-private (only-owner)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (ok true)
  )
)

(define-private (only-city)
  (let ((city (var-get city-contract)))
    (asserts! (is-some city) ERR-NO-CITY)
    (asserts! (is-eq tx-sender (unwrap! city ERR-NO-CITY)) ERR-NOT-CITY)
    (ok true)
  )
)

(define-private (house-mult (n uint))
  (if (is-eq n u0) u1
    (if (is-eq n u1) u3
      (if (is-eq n u2) u6
        (if (is-eq n u3) u10
          (if (is-eq n u4) u16
            u25
          )
        )
      )
    )
  )
)

(define-private (deed-owner (id uint))
  (unwrap-panic (contract-call? .sz-deed get-owner id))
)

(define-private (lot-weight (id uint))
  (if (is-none (deed-owner id))
    u0
    (match (contract-call? .sz-deed get-lot id)
      meta (if (is-eq (get kind meta) KIND-PROPERTY)
        (house-mult (contract-call? .sz-deed get-houses id))
        u2
      )
      u0
    )
  )
)

(define-private (sum-weight (id uint) (acc uint))
  (+ acc (lot-weight id))
)

(define-private (pay-ft (amount uint) (to principal))
  (if (is-eq amount u0)
    (ok true)
    (begin
      (unwrap!
        (as-contract? ((with-ft current-contract "sitz" amount))
          (unwrap! (ft-transfer? sitz amount tx-sender to) ERR-TRANSFER)
        )
        ERR-TRANSFER
      )
      (ok true)
    )
  )
)

(define-private (pay-lot (id uint) (ctx { vault: uint, total: uint, paid: uint }))
  (let (
      (total (get total ctx))
      (vault (get vault ctx))
      (w (lot-weight id))
      (share (if (or (is-eq total u0) (is-eq w u0)) u0 (/ (* vault w) total)))
      (who (deed-owner id))
    )
    (if (or (is-eq share u0) (is-none who))
      ctx
      (match (pay-ft share (unwrap-panic who))
        ok-pay (begin
          (var-set yield-vault (- (var-get yield-vault) share))
          {
            vault: vault,
            total: total,
            paid: (+ (get paid ctx) share)
          }
        )
        err-pay ctx
      )
    )
  )
)

(define-public (set-city-contract (city principal))
  (begin
    (try! (only-owner))
    (asserts! (is-none (var-get city-contract)) ERR-CITY-SET)
    (var-set city-contract (some city))
    (ok true)
  )
)

;; One-way. Turns off the testnet faucet.
(define-public (seal-mainnet)
  (begin
    (try! (only-owner))
    (var-set mainnet true)
    (ok true)
  )
)

(define-public (genesis)
  (begin
    (try! (only-owner))
    (asserts! (not (var-get genesis-done)) ERR-GENESIS)
    (var-set genesis-done true)
    (ft-mint? sitz GENESIS-SUPPLY CONTRACT-OWNER)
  )
)

;; Testnet only. Deployer-gated. Disabled after seal-mainnet.
(define-public (faucet (to principal) (amount uint))
  (begin
    (try! (only-owner))
    (asserts! (not (var-get mainnet)) ERR-MAINNET)
    (asserts! (> amount u0) ERR-ZERO)
    (ft-mint? sitz amount to)
  )
)

;; SIP-010 transfer. 5% tax on every transfer (buy and sell).
;; Split of the tax: 40% yield vault / 25% ops SITZ / 20% community SITZ / 15% burn.
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-SENDER)
    (asserts! (> amount u0) ERR-ZERO)
    (let (
        (tax (/ (* amount TOKEN-TAX-BPS) BPS))
        (net (- amount tax))
        (yield-cut (/ (* tax YIELD-BPS) BPS))
        (ops-cut (/ (* tax OPS-BPS) BPS))
        (community-cut (/ (* tax COMMUNITY-BPS) BPS))
        (burn-cut (- tax (+ yield-cut ops-cut community-cut)))
        (to-contract (+ yield-cut ops-cut community-cut))
      )
      (try! (ft-transfer? sitz net sender recipient))
      (if (> to-contract u0)
        (try! (ft-transfer? sitz to-contract sender current-contract))
        true
      )
      (if (> burn-cut u0)
        (try! (ft-burn? sitz burn-cut sender))
        true
      )
      (var-set yield-vault (+ (var-get yield-vault) yield-cut))
      (var-set ops-sitz (+ (var-get ops-sitz) ops-cut))
      (var-set community-sitz (+ (var-get community-sitz) community-cut))
      (match memo to-print (print to-print) 0x)
      (ok {
        net: net,
        tax: tax,
        yield: yield-cut,
        ops: ops-cut,
        community: community-cut,
        burn: burn-cut
      })
    )
  )
)

;; Only city. Pays the SITZ vault to deed owners by HOUSE_MULT.
;; Property 1/3/6/10/16/25. Transit and utility 2. Unowned lots 0.
;; Skip if vault < 10 SITZ. Drip is not taxed.
(define-public (drip (epoch uint))
  (begin
    (try! (only-city))
    (asserts! (> epoch (var-get last-drip-epoch)) ERR-ALREADY-DRIP)
    (var-set last-drip-epoch epoch)
    (let (
        (vault (var-get yield-vault))
        (total (fold sum-weight LOT-IDS u0))
      )
      (if (or (< vault TOKEN-YIELD-MIN) (is-eq total u0))
        (ok { skipped: true, paid: u0, total-weight: total })
        (let ((end (fold pay-lot LOT-IDS { vault: vault, total: total, paid: u0 })))
          (ok { skipped: false, paid: (get paid end), total-weight: total })
        )
      )
    )
  )
)

(define-read-only (get-name)
  (ok "SITZ")
)

(define-read-only (get-symbol)
  (ok "SITZ")
)

(define-read-only (get-decimals)
  (ok DECIMALS)
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance sitz who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply sitz))
)

(define-read-only (get-token-uri)
  (ok (var-get token-uri))
)

(define-read-only (get-yield-vault)
  (var-get yield-vault)
)

(define-read-only (get-ops-sitz)
  (var-get ops-sitz)
)

(define-read-only (get-community-sitz)
  (var-get community-sitz)
)

(define-read-only (get-last-drip-epoch)
  (var-get last-drip-epoch)
)

(define-read-only (is-mainnet)
  (var-get mainnet)
)

(define-read-only (get-city-contract)
  (var-get city-contract)
)

(define-read-only (get-yield-min)
  TOKEN-YIELD-MIN
)
