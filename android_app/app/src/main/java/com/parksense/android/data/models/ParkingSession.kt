package com.parksense.android.data.models

import com.google.gson.annotations.SerializedName

data class ParkingSession(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("slot_id")
    val slotId: String?,
    
    @SerializedName("slot_name")
    val slotName: String,
    
    @SerializedName("started_at")
    val startedAt: String,
    
    @SerializedName("ended_at")
    val endedAt: String,
    
    @SerializedName("duration_minutes")
    val durationMinutes: Int,
    
    @SerializedName("amount_charged")
    val amountCharged: Double,
    
    @SerializedName("was_overtime")
    val wasOvertime: Boolean,
    
    @SerializedName("created_at")
    val createdAt: String
)
