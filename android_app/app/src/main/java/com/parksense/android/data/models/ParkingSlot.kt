package com.parksense.android.data.models

import com.google.gson.annotations.SerializedName

data class ParkingSlot(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("allowed_minutes")
    val allowedMinutes: Int,
    
    @SerializedName("is_disabled")
    val isDisabled: Boolean,
    
    @SerializedName("is_placeholder")
    val isPlaceholder: Boolean,
    
    @SerializedName("slot_status")
    val slotStatus: SlotStatus?
)

data class SlotStatus(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("slot_id")
    val slotId: String,
    
    @SerializedName("status")
    val status: String, // "vacant", "occupied", "overtime", "disabled"
    
    @SerializedName("occupied_since")
    val occupiedSince: String?,
    
    @SerializedName("updated_at")
    val updatedAt: String
)
