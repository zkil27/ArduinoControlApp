package com.parksense.android.data.repository

import com.parksense.android.data.api.RetrofitClient
import com.parksense.android.data.models.ParkingSession
import com.parksense.android.data.models.ParkingSlot
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

data class TodayStats(
    val totalSessions: Int,
    val totalRevenue: Double,
    val usageRate: Int
)

class ParkingRepository {
    
    private val api = RetrofitClient.supabaseApi
    
    suspend fun fetchParkingSlots(): Result<List<ParkingSlot>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getParkingSlots()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Error: ${response.code()} - ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun fetchParkingSessions(limit: Int = 50): Result<List<ParkingSession>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getParkingSessions(limit)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Error: ${response.code()} - ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun calculateTodayStats(sessions: List<ParkingSession>): TodayStats {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        
        val todaySessions = sessions.filter { session ->
            session.endedAt.startsWith(today)
        }
        
        val totalRevenue = todaySessions.sumOf { it.amountCharged }
        val usageRate = minOf((todaySessions.size * 100) / 20, 100) // 20 sessions = 100%
        
        return TodayStats(
            totalSessions = todaySessions.size,
            totalRevenue = totalRevenue,
            usageRate = usageRate
        )
    }
    
    // ============================================
    // Manual Control Methods
    // ============================================
    
    /**
     * Add a new virtual parking slot with specified status
     */
    suspend fun addVirtualSlot(status: String): Result<ParkingSlot> = withContext(Dispatchers.IO) {
        try {
            // First get existing slots to determine next name
            val slotsResponse = api.getParkingSlots()
            val existingSlots = slotsResponse.body() ?: emptyList()
            val nextNumber = existingSlots.size + 1
            val slotName = "P$nextNumber"
            val slotId = UUID.randomUUID().toString()
            
            // Create the slot
            val slotBody = mapOf(
                "id" to slotId,
                "name" to slotName,
                "allowed_minutes" to 60,
                "is_disabled" to false,
                "is_placeholder" to true
            )
            
            val slotResponse = api.addParkingSlot(slotBody)
            if (!slotResponse.isSuccessful) {
                return@withContext Result.failure(Exception("Failed to create slot: ${slotResponse.message()}"))
            }
            
            // Create the slot status
            val statusBody = mapOf(
                "id" to UUID.randomUUID().toString(),
                "slot_id" to slotId,
                "status" to status,
                "updated_at" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
            )
            
            val statusResponse = api.addSlotStatus(statusBody)
            if (!statusResponse.isSuccessful) {
                return@withContext Result.failure(Exception("Failed to create status: ${statusResponse.message()}"))
            }
            
            val createdSlot = slotResponse.body()?.firstOrNull()
            if (createdSlot != null) {
                Result.success(createdSlot)
            } else {
                Result.failure(Exception("Slot created but response empty"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Remove the last parking slot
     */
    suspend fun removeLastSlot(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val slotsResponse = api.getParkingSlots()
            val slots = slotsResponse.body() ?: emptyList()
            
            if (slots.isEmpty()) {
                return@withContext Result.failure(Exception("No slots to remove"))
            }
            
            val lastSlot = slots.last()
            
            // Delete status first (foreign key constraint)
            api.deleteSlotStatus("eq.${lastSlot.id}")
            // Then delete slot
            val response = api.deleteParkingSlot("eq.${lastSlot.id}")
            
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Vacate all occupied/overtime slots
     */
    suspend fun vacateAllSlots(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val updateBody = mapOf(
                "status" to "vacant",
                "occupied_since" to null as Any?,
                "updated_at" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
            )
            
            // Update occupied slots
            api.updateAllSlotStatuses("eq.occupied", updateBody)
            // Update overtime slots
            api.updateAllSlotStatuses("eq.overtime", updateBody)
            
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Simulate traffic by randomly toggling a slot status
     */
    suspend fun simulateTraffic(): Result<String> = withContext(Dispatchers.IO) {
        try {
            val slotsResponse = api.getParkingSlots()
            val slots = slotsResponse.body() ?: emptyList()
            
            if (slots.isEmpty()) {
                return@withContext Result.failure(Exception("No slots available"))
            }
            
            val randomSlot = slots.random()
            val currentStatus = randomSlot.slotStatus?.status ?: "vacant"
            val newStatus = if (currentStatus == "vacant") "occupied" else "vacant"
            
            val updateBody = mapOf(
                "status" to newStatus,
                "occupied_since" to if (newStatus == "occupied") 
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date()) 
                else null as Any?,
                "updated_at" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
            )
            
            val response = api.updateSlotStatus("eq.${randomSlot.id}", updateBody)
            
            if (response.isSuccessful) {
                Result.success("${randomSlot.name} → $newStatus")
            } else {
                Result.failure(Exception("Failed to update: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Reset slots to P1-P5
     */
    suspend fun resetParkingSlots(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            // Get all current slots
            val slotsResponse = api.getParkingSlots()
            val existingSlots = slotsResponse.body() ?: emptyList()
            
            // Delete all existing slots (status first due to FK)
            for (slot in existingSlots) {
                api.deleteSlotStatus("eq.${slot.id}")
                api.deleteParkingSlot("eq.${slot.id}")
            }
            
            // Create P1-P5
            for (i in 1..5) {
                val slotId = UUID.randomUUID().toString()
                val slotBody = mapOf(
                    "id" to slotId,
                    "name" to "P$i",
                    "allowed_minutes" to 60,
                    "is_disabled" to false,
                    "is_placeholder" to false
                )
                api.addParkingSlot(slotBody)
                
                val statusBody = mapOf(
                    "id" to UUID.randomUUID().toString(),
                    "slot_id" to slotId,
                    "status" to "vacant",
                    "updated_at" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
                )
                api.addSlotStatus(statusBody)
            }
            
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
