package com.parksense.android.data.api

import com.parksense.android.data.models.ParkingSlot
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Headers

interface SupabaseApi {
    
    @Headers("Content-Type: application/json")
    @GET("parking_slots?select=*,slot_status(*)&order=name.asc")
    suspend fun getParkingSlots(): Response<List<ParkingSlot>>
}
