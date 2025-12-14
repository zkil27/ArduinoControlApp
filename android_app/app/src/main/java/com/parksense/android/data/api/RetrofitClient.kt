package com.parksense.android.data.api

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    
    // TODO: Replace with your actual Supabase URL and API key
    private const val SUPABASE_URL = "https://rziqggjazwhwtgbikkcf.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6aXFnZ2phendod3RnYmlra2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzY4NDksImV4cCI6MjA4MTIxMjg0OX0.rsacDNT_YbfPicpmlOCqVxLzGELAU3fLDKFiSOuZbW0"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val authInterceptor = Interceptor { chain ->
        val request = chain.request().newBuilder()
            .addHeader("apikey", SUPABASE_ANON_KEY)
            .addHeader("Authorization", "Bearer $SUPABASE_ANON_KEY")
            .build()
        chain.proceed(request)
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl("$SUPABASE_URL/rest/v1/")
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val supabaseApi: SupabaseApi = retrofit.create(SupabaseApi::class.java)
}
