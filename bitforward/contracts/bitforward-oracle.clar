;; BitForward Oracle Contract
;; This contract handles price feeds for various assets
;; Only the contract owner can update prices

;; constants
(define-constant owner tx-sender)
(define-constant err-owner-only (err u200))
(define-constant err-asset-not-supported (err u201))
(define-constant err-no-value (err u202))

;; Define supported assets map
(define-map supported (string-ascii 3) bool)

;; Initialize supported assets
(map-set supported "USD" true)
(map-set supported "EUR" true)
(map-set supported "GBP" true)

;; Define price feeds for different assets
(define-map prices (string-ascii 3) uint)

;; Update a single asset price
(define-public (set-price (asset (string-ascii 3)) (price uint))
    (begin
        ;; Check if the caller is the contract owner
        (asserts! (is-eq tx-sender owner) err-owner-only)
        ;; Check if the asset is supported
        (asserts! (default-to false (map-get? supported asset)) err-asset-not-supported)
        ;; Update the price feed for this asset
        (asserts! (> price u0) err-no-value)
        (map-set prices asset price)
        (ok true)
    )
)

;; Batch update multiple asset prices
;; Input: List of tuples with { asset: (string-ascii 3), price: uint }
(define-public (set-prices (updates (list 20 { asset: (string-ascii 3), price: uint })))
    (begin
        ;; Check if the caller is the contract owner
        (asserts! (is-eq tx-sender owner) err-owner-only)
        
        ;; Process each price update
        (map update-single updates)
        (ok true)
    )
)

;; Helper function to process a single price update in batch
(define-private (update-single (update { asset: (string-ascii 3), price: uint }))
    (let ((asset (get asset update))
          (price (get price update)))
        
        ;; Verify the asset is supported and price is valid
        (if (and (default-to false (map-get? supported asset)) (> price u0))
            (begin
                (map-set prices asset price)
                true
            )
            false
        )
    )
)

;; Get price for a specific asset
(define-read-only (get-price (asset (string-ascii 3)))
    (begin
        (asserts! (default-to false (map-get? supported asset)) err-asset-not-supported)
        (ok (default-to u0 (map-get? prices asset)))
    )
)