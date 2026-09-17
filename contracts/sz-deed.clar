;; Sitizen deed NFT (Clarity 6)
;; SIP-009 without impl-trait on testnet. Houses are a uint 0-5 on the same id.
;; token-id = space id. SZ-01 is u1. No SITZ fee to build.

;; Mainnet only - uncomment before mainnet deploy:
;; (impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)

(define-constant CONTRACT-OWNER tx-sender)
(define-non-fungible-token sz-deed uint)

(define-constant KIND-PROPERTY u1)
(define-constant KIND-TRANSIT u2)
(define-constant KIND-UTILITY u3)
(define-constant MAX-HOUSES u5)
(define-constant MICRO u1000000)
(define-constant BUILD-BPS u45)
(define-constant MIN-HOUSE u40000000)
(define-constant LISTING-FEE-BPS u25)
(define-constant LISTING-FEE-DENOM u1000)

(define-constant ERR-NOT-OWNER (err u200))
(define-constant ERR-NOT-CITY (err u201))
(define-constant ERR-NO-CITY (err u202))
(define-constant ERR-CITY-SET (err u203))
(define-constant ERR-NOT-LOT (err u204))
(define-constant ERR-OWNED (err u205))
(define-constant ERR-UNOWNED (err u206))
(define-constant ERR-NO-ROW (err u207))
(define-constant ERR-NO-HOUSES (err u208))
(define-constant ERR-MAX-HOUSES (err u209))
(define-constant ERR-PAUSED (err u210))
(define-constant ERR-ZERO (err u211))
(define-constant ERR-NFT (err u212))

(define-data-var city-contract (optional principal) none)
(define-data-var paused bool false)
(define-data-var last-id uint u0)
(define-data-var seeded bool false)

(define-map lots
  uint
  { kind: uint, printed: uint, group: uint }
)
(define-map houses uint uint)
(define-map extra-unlocked uint bool)

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

(define-private (put-lot (id uint) (kind uint) (printed uint) (group uint))
  (map-set lots id { kind: kind, printed: printed, group: group })
)

(define-private (seed-founders)
  (begin
    (put-lot u1 KIND-PROPERTY u60 u1)
    (put-lot u3 KIND-PROPERTY u60 u1)
    (put-lot u6 KIND-PROPERTY u100 u2)
    (put-lot u7 KIND-PROPERTY u100 u2)
    (put-lot u8 KIND-PROPERTY u120 u2)
    (put-lot u11 KIND-PROPERTY u140 u3)
    (put-lot u12 KIND-PROPERTY u140 u3)
    (put-lot u13 KIND-PROPERTY u160 u3)
    (put-lot u16 KIND-PROPERTY u180 u4)
    (put-lot u17 KIND-PROPERTY u180 u4)
    (put-lot u18 KIND-PROPERTY u200 u4)
    (put-lot u21 KIND-PROPERTY u220 u5)
    (put-lot u22 KIND-PROPERTY u220 u5)
    (put-lot u23 KIND-PROPERTY u240 u5)
    (put-lot u26 KIND-PROPERTY u260 u6)
    (put-lot u27 KIND-PROPERTY u260 u6)
    (put-lot u28 KIND-PROPERTY u280 u6)
    (put-lot u31 KIND-PROPERTY u300 u7)
    (put-lot u32 KIND-PROPERTY u300 u7)
    (put-lot u33 KIND-PROPERTY u320 u7)
    (put-lot u37 KIND-PROPERTY u350 u8)
    (put-lot u39 KIND-PROPERTY u400 u8)
    (put-lot u5 KIND-TRANSIT u200 u0)
    (put-lot u15 KIND-TRANSIT u200 u0)
    (put-lot u25 KIND-TRANSIT u200 u0)
    (put-lot u35 KIND-TRANSIT u200 u0)
    (put-lot u14 KIND-UTILITY u150 u0)
    (put-lot u29 KIND-UTILITY u150 u0)
    (var-set seeded true)
    true
  )
)

(define-private (ensure-seeded)
  (begin
    (if (var-get seeded) true (seed-founders))
    true
  )
)

(define-private (lot (id uint))
  (map-get? lots id)
)

(define-private (group-ids (g uint))
  (if (>= g u9)
    (let ((base (+ u40 (* (- g u9) u4))))
      (list base (+ base u1) (+ base u2))
    )
    (if (is-eq g u1) (list u1 u3 u0)
      (if (is-eq g u2) (list u6 u7 u8)
        (if (is-eq g u3) (list u11 u12 u13)
          (if (is-eq g u4) (list u16 u17 u18)
            (if (is-eq g u5) (list u21 u22 u23)
              (if (is-eq g u6) (list u26 u27 u28)
                (if (is-eq g u7) (list u31 u32 u33)
                  (if (is-eq g u8) (list u37 u39 u0)
                    (list u0 u0 u0)
                  )
                )
              )
            )
          )
        )
      )
    )
  )
)

(define-private (id-owned-by (id uint) (who principal))
  (or (is-eq id u0) (is-eq (nft-get-owner? sz-deed id) (some who)))
)

(define-private (owns-full-row (who principal) (id uint))
  (match (map-get? lots id)
    meta (if (is-eq (get group meta) u0)
      false
      (let ((ids (group-ids (get group meta))))
        (and
          (id-owned-by (default-to u0 (element-at? ids u0)) who)
          (id-owned-by (default-to u0 (element-at? ids u1)) who)
          (id-owned-by (default-to u0 (element-at? ids u2)) who)
        )
      )
    )
    false
  )
)

(define-private (compute-house-cost (printed uint))
  (let ((raw (/ (* (* printed MICRO) BUILD-BPS) u100)))
    (if (< raw MIN-HOUSE) MIN-HOUSE raw)
  )
)

(define-public (set-city-contract (city principal))
  (begin
    (try! (only-owner))
    (asserts! (is-none (var-get city-contract)) ERR-CITY-SET)
    (var-set city-contract (some city))
    (ensure-seeded)
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

;; City unlocks expansion lots (Lantern+). Founders are seeded.
(define-public (unlock-lot (id uint) (kind uint) (printed uint) (group uint))
  (begin
    (try! (only-city))
    (ensure-seeded)
    (asserts! (is-none (map-get? lots id)) ERR-OWNED)
    (asserts! (or (is-eq kind KIND-PROPERTY) (or (is-eq kind KIND-TRANSIT) (is-eq kind KIND-UTILITY))) ERR-NOT-LOT)
    (put-lot id kind printed group)
    (map-set extra-unlocked id true)
    (ok true)
  )
)

(define-public (mint (id uint) (to principal))
  (begin
    (try! (only-city))
    (ensure-seeded)
    (asserts! (is-some (map-get? lots id)) ERR-NOT-LOT)
    (asserts! (is-none (nft-get-owner? sz-deed id)) ERR-OWNED)
    (unwrap! (nft-mint? sz-deed id to) ERR-NFT)
    (map-set houses id u0)
    (if (> id (var-get last-id)) (var-set last-id id) true)
    (ok id)
  )
)

(define-public (improve (id uint))
  (let (
      (owner (unwrap! (nft-get-owner? sz-deed id) ERR-UNOWNED))
      (meta (unwrap! (lot id) ERR-NOT-LOT))
      (n (default-to u0 (map-get? houses id)))
      (cost (compute-house-cost (get printed meta)))
    )
    (asserts! (is-eq tx-sender owner) ERR-NOT-OWNER)
    (asserts! (is-eq (get kind meta) KIND-PROPERTY) ERR-NO-HOUSES)
    (asserts! (< n MAX-HOUSES) ERR-MAX-HOUSES)
    (asserts! (owns-full-row tx-sender id) ERR-NO-ROW)
    (try! (contract-call? .stx-treasury credit-build cost))
    (map-set houses id (+ n u1))
    (ok (+ n u1))
  )
)

(define-public (transfer (id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (is-eq tx-sender sender) ERR-NOT-OWNER)
    (asserts! (is-eq (some sender) (nft-get-owner? sz-deed id)) ERR-NOT-OWNER)
    (unwrap! (nft-transfer? sz-deed id sender recipient) ERR-NFT)
    (ok true)
  )
)

;; City calls this on marketplace accept. 2.5% of sale STX to treasury 60/40.
(define-public (take-listing-fee (sale-price uint))
  (begin
    (try! (only-city))
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (> sale-price u0) ERR-ZERO)
    (let ((fee (/ (* sale-price LISTING-FEE-BPS) LISTING-FEE-DENOM)))
      (if (is-eq fee u0)
        (ok u0)
        (begin
          (try! (contract-call? .stx-treasury credit-skim fee))
          (ok fee)
        )
      )
    )
  )
)

(define-read-only (get-last-token-id)
  (ok (var-get last-id))
)

(define-read-only (get-token-uri (id uint))
  (ok none)
)

(define-read-only (get-owner (id uint))
  (ok (nft-get-owner? sz-deed id))
)

(define-read-only (get-houses (id uint))
  (default-to u0 (map-get? houses id))
)

(define-read-only (get-lot (id uint))
  (map-get? lots id)
)

(define-read-only (house-cost (id uint))
  (match (map-get? lots id)
    meta (compute-house-cost (get printed meta))
    u0
  )
)

(define-read-only (has-full-row (who principal) (id uint))
  (owns-full-row who id)
)

(define-read-only (is-paused)
  (var-get paused)
)

(define-read-only (get-city-contract)
  (var-get city-contract)
)
