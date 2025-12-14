package com.parksense.android.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.parksense.android.R
import com.parksense.android.data.repository.ParkingRepository
import com.parksense.android.ui.SlotAdapter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class DashboardFragment : Fragment() {
    
    private lateinit var recyclerView: RecyclerView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var slotAdapter: SlotAdapter
    private val repository = ParkingRepository()
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_dashboard, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupViews(view)
        loadParkingSlots()
        startAutoRefresh()
    }
    
    private fun setupViews(view: View) {
        recyclerView = view.findViewById(R.id.recyclerView)
        swipeRefresh = view.findViewById(R.id.swipeRefresh)
        progressBar = view.findViewById(R.id.progressBar)
        errorText = view.findViewById(R.id.errorText)
        
        slotAdapter = SlotAdapter()
        recyclerView.apply {
            layoutManager = GridLayoutManager(requireContext(), 2)
            adapter = slotAdapter
        }
        
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
    }
    
    private fun startAutoRefresh() {
        lifecycleScope.launch {
            while (true) {
                delay(5000)
                if (!swipeRefresh.isRefreshing && isResumed) {
                    repository.fetchParkingSlots().onSuccess { slots ->
                        slotAdapter.updateSlots(slots)
                    }
                }
            }
        }
    }
}
