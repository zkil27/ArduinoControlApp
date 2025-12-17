package com.parksense.android.data.api

import com.parksense.android.data.models.ParkingSession
import com.parksense.android.data.models.ParkingSlot
import com.parksense.android.data.models.SlotStatus
import retrofit2.Response
import retrofit2.http.*

interface SupabaseApi {
    
    @Headers("Content-Type: application/json")
    @GET("parking_slots?select=*,slot_status(*)&order=name.asc")
    suspend fun getParkingSlots(): Response<List<ParkingSlot>>
    
    @Headers("Content-Type: application/json")
    @GET("parking_sessions?order=ended_at.desc")
    suspend fun getParkingSessions(
        @Query("limit") limit: Int = 50
    ): Response<List<ParkingSession>>
    
    // ============================================
    // Manual Control API Methods
    // ============================================
    
    @Headers("Content-Type: application/json", "Prefer: return=representation")
    @POST("parking_slots")
    suspend fun addParkingSlot(@Body slot: Map<String, @JvmSuppressWildcards Any?>): Response<List<ParkingSlot>>
    
    @Headers("Content-Type: application/json", "Prefer: return=representation")
    @POST("slot_status")
    suspend fun addSlotStatus(@Body status: Map<String, @JvmSuppressWildcards Any?>): Response<List<SlotStatus>>
    
    @Headers("Content-Type: application/json")
    @PATCH("slot_status")
    suspend fun updateSlotStatus(
        @Query("slot_id") slotIdFilter: String,
        @Body status: Map<String, @JvmSuppressWildcards Any?>
    ): Response<Unit>
    
    @Headers("Content-Type: application/json")
    @PATCH("slot_status")
    suspend fun updateAllSlotStatuses(
        @Query("status") statusFilter: String,
        @Body status: Map<String, @JvmSuppressWildcards Any?>
    ): Response<Unit>
    
    @Headers("Content-Type: application/json")
    @DELETE("parking_slots")
    suspend fun deleteParkingSlot(@Query("id") slotIdFilter: String): Response<Unit>
    
    @Headers("Content-Type: application/json")
    @DELETE("slot_status")
    suspend fun deleteSlotStatus(@Query("slot_id") slotIdFilter: String): Response<Unit>
    
    // ============================================
    // Parking Sessions API Methods
    // ============================================
    
    @Headers("Content-Type: application/json", "Prefer: return=representation")
    @POST("parking_sessions")
    suspend fun createParkingSession(@Body session: Map<String, @JvmSuppressWildcards Any?>): Response<List<ParkingSession>>
}
