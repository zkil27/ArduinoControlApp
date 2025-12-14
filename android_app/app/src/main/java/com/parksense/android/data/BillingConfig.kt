package com.parksense.android.data

object BillingConfig {
    const val CURRENCY = "₱"
    const val RATE_PER_HOUR = 25.0
    const val OVERTIME_RATE_PER_HOUR = 50.0
    const val OVERTIME_THRESHOLD_MINUTES = 120 // 2 hours
    
    data class BillingResult(
        val amount: Double,
        val isOvertime: Boolean
    )
    
    fun calculateBilling(minutesParked: Int): BillingResult {
        val isOvertime = minutesParked > OVERTIME_THRESHOLD_MINUTES
        
        val amount = if (!isOvertime) {
            (minutesParked / 60.0) * RATE_PER_HOUR
        } else {
            val regularMinutes = OVERTIME_THRESHOLD_MINUTES
            val overtimeMinutes = minutesParked - OVERTIME_THRESHOLD_MINUTES
            (regularMinutes / 60.0) * RATE_PER_HOUR + (overtimeMinutes / 60.0) * OVERTIME_RATE_PER_HOUR
        }
        
        return BillingResult(
            amount = (amount * 100).toInt() / 100.0, // Round to 2 decimal places
            isOvertime = isOvertime
        )
    }
}
