package com.parksense.android.data.repository

import com.parksense.android.data.api.RetrofitClient
import com.parksense.android.data.models.ParkingSlot
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

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
}
