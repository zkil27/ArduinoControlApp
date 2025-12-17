package com.parksense.android.data

object BillingConfig {
    const val CURRENCY = "₱"
    const val BASE_RATE = 25.0           // Flat fee before overtime
    const val OVERTIME_RATE = 100.0      // Flat fee after overtime (replaces base)
    const val OVERTIME_THRESHOLD_MINUTES = 120 // 2 hours
    
    data class BillingResult(
        val amount: Double,
        val isOvertime: Boolean
    )
    
    /**
     * Calculate billing using one-time flat fee model:
     * - Before overtime: ₱25 flat
     * - After overtime: ₱100 flat (replaces base)
     */
    fun calculateBilling(minutesParked: Int): BillingResult {
        val isOvertime = minutesParked > OVERTIME_THRESHOLD_MINUTES
        
        // One-time flat fee
        val amount = if (isOvertime) OVERTIME_RATE else BASE_RATE
        
        return BillingResult(
            amount = amount,
            isOvertime = isOvertime
        )
    }
}
