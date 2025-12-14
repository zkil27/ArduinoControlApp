package com.parksense.android

import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.parksense.android.data.repository.ParkingRepository
import com.parksense.android.ui.SlotAdapter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    
    private lateinit var recyclerView: RecyclerView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var slotAdapter: SlotAdapter
    private val repository = ParkingRepository()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        setupViews()
        loadParkingSlots()
        startAutoRefresh()
    }
    
    private fun setupViews() {
        recyclerView = findViewById(R.id.recyclerView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        progressBar = findViewById(R.id.progressBar)
        errorText = findViewById(R.id.errorText)
        
        // Setup RecyclerView with Grid Layout (2 columns)
        slotAdapter = SlotAdapter()
        recyclerView.apply {
            layoutManager = GridLayoutManager(this@MainActivity, 2)
            adapter = slotAdapter
        }
        
        // Setup swipe-to-refresh
        swipeRefresh.setOnRefreshListener {
            loadParkingSlots()
        }
    }
    
    private fun loadParkingSlots() {
        lifecycleScope.launch {
            try {
                progressBar.visibility = View.VISIBLE
                errorText.visibility = View.GONE
                
                val result = repository.fetchParkingSlots()
                
                result.onSuccess { slots ->
                    slotAdapter.updateSlots(slots)
                    recyclerView.visibility = View.VISIBLE
                    errorText.visibility = View.GONE
                }.onFailure { error ->
                    showError("Error: ${error.message}")
                }
                
            } catch (e: Exception) {
                showError("Failed to load parking slots")
            } finally {
                progressBar.visibility = View.GONE
                swipeRefresh.isRefreshing = false
            }
        }
    }
    
    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
        recyclerView.visibility = View.GONE
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    // Auto-refresh every 5 seconds to simulate real-time updates
    private fun startAutoRefresh() {
        lifecycleScope.launch {
            while (true) {
                delay(5000) // 5 seconds
                if (!swipeRefresh.isRefreshing) {
                    repository.fetchParkingSlots().onSuccess { slots ->
                        slotAdapter.updateSlots(slots)
                    }
                }
            }
        }
    }
}
