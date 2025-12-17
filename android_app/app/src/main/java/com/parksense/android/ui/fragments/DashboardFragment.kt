package com.parksense.android.ui.fragments

import android.app.AlertDialog
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.parksense.android.R
import com.parksense.android.data.BillingConfig
import com.parksense.android.data.models.ParkingSlot
import com.parksense.android.data.repository.ParkingRepository
import com.parksense.android.ui.SlotAdapter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DashboardFragment : Fragment() {
    
    private lateinit var recyclerView: RecyclerView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var slotAdapter: SlotAdapter
    private val repository = ParkingRepository()
    
    private var currentDialog: AlertDialog? = null
    private val dialogUpdateHandler = Handler(Looper.getMainLooper())
    private var dialogUpdateRunnable: Runnable? = null
    
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
        
        slotAdapter = SlotAdapter { slot ->
            showSlotDetailsDialog(slot)
        }
        recyclerView.apply {
            layoutManager = GridLayoutManager(requireContext(), 2)
            adapter = slotAdapter
        }
        
        swipeRefresh.setOnRefreshListener {
            loadParkingSlots()
        }
    }
    
    private fun showSlotDetailsDialog(slot: ParkingSlot) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_slot_details, null)
        
        val txtSlotName = dialogView.findViewById<TextView>(R.id.txtSlotName)
        val txtStatusLabel = dialogView.findViewById<TextView>(R.id.txtStatusLabel)
        val txtSinceTime = dialogView.findViewById<TextView>(R.id.txtSinceTime)
        val txtDuration = dialogView.findViewById<TextView>(R.id.txtDuration)
        val txtBillingAmount = dialogView.findViewById<TextView>(R.id.txtBillingAmount)
        val txtBillingRate = dialogView.findViewById<TextView>(R.id.txtBillingRate)
        val txtSensorPercent = dialogView.findViewById<TextView>(R.id.txtSensorPercent)
        val progressSensor = dialogView.findViewById<ProgressBar>(R.id.progressSensor)
        val btnClose = dialogView.findViewById<View>(R.id.btnClose)
        val btnDisableEnable = dialogView.findViewById<Button>(R.id.btnDisableEnable)
        val btnPing = dialogView.findViewById<Button>(R.id.btnPing)
        
        // Set slot name and status
        txtSlotName.text = slot.name
        val status = slot.slotStatus?.status ?: "vacant"
        txtStatusLabel.text = status.uppercase()
        
        // Set status color
        val statusColor = when (status) {
            "occupied" -> android.graphics.Color.parseColor("#42bc2b")
            "overtime" -> android.graphics.Color.parseColor("#ba2d2d")
            "vacant" -> android.graphics.Color.parseColor("#444444")
            else -> android.graphics.Color.parseColor("#444444")
        }
        txtStatusLabel.setTextColor(statusColor)
        
        // Set disable/enable button text
        btnDisableEnable.text = if (slot.isDisabled) getString(R.string.slot_details_enable) else getString(R.string.slot_details_disable)
        
        // Setup initial values
        updateDialogTime(slot, txtSinceTime, txtDuration, txtBillingAmount, txtBillingRate)
        
        // Sensor data (placeholder - use 0 for now)
        val sensorValue = 0
        val sensorPercent = (sensorValue * 100) / 1023
        txtSensorPercent.text = "$sensorPercent%"
        progressSensor.progress = sensorPercent
        
        // Create dialog
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .setCancelable(true)
            .create()
        
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        
        // Close button
        btnClose.setOnClickListener {
            dialog.dismiss()
        }
        
        // Disable/Enable button
        btnDisableEnable.setOnClickListener {
            val mainActivity = activity as? com.parksense.android.MainActivity
            val btManager = mainActivity?.getBluetoothManager()
            
            if (btManager == null || !btManager.isConnected()) {
                Toast.makeText(requireContext(), "Not connected to Bluetooth device", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            val slotName = slot.name
            val currentlyDisabled = slot.isDisabled
            
            val success = if (currentlyDisabled) {
                btManager.enableSlot(slotName)
            } else {
                btManager.disableSlot(slotName)
            }
            
            if (success) {
                Toast.makeText(requireContext(), 
                    if (currentlyDisabled) "Enable command sent to $slotName" else "Disable command sent to $slotName", 
                    Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(requireContext(), "Failed to send command", Toast.LENGTH_SHORT).show()
            }
            dialog.dismiss()
        }
        
        // Ping button
        btnPing.setOnClickListener {
            val mainActivity = activity as? com.parksense.android.MainActivity
            val btManager = mainActivity?.getBluetoothManager()
            
            if (btManager == null || !btManager.isConnected()) {
                Toast.makeText(requireContext(), "Not connected to Bluetooth device", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            val success = btManager.pingSlot(slot.name)
            if (success) {
                Toast.makeText(requireContext(), "Ping sent to ${slot.name} - LED will flash 5 times", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(requireContext(), "Failed to send ping", Toast.LENGTH_SHORT).show()
            }
        }
        
        // Start real-time updates for duration and billing
        dialogUpdateRunnable = object : Runnable {
            override fun run() {
                if (dialog.isShowing) {
                    updateDialogTime(slot, txtSinceTime, txtDuration, txtBillingAmount, txtBillingRate)
                    dialogUpdateHandler.postDelayed(this, 1000) // Update every second
                }
            }
        }
        dialogUpdateHandler.post(dialogUpdateRunnable!!)
        
        dialog.setOnDismissListener {
            dialogUpdateRunnable?.let { dialogUpdateHandler.removeCallbacks(it) }
            currentDialog = null
        }
        
        currentDialog = dialog
        dialog.show()
    }
    
    private fun updateDialogTime(
        slot: ParkingSlot,
        txtSinceTime: TextView,
        txtDuration: TextView,
        txtBillingAmount: TextView,
        txtBillingRate: TextView
    ) {
        val occupiedSince = slot.slotStatus?.occupiedSince
        
        if (occupiedSince != null && (slot.slotStatus.status == "occupied" || slot.slotStatus.status == "overtime")) {
            // Format since time
            try {
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                val date = sdf.parse(occupiedSince.substringBefore('+').substringBefore('Z'))
                val timeFormat = SimpleDateFormat("h:mm a", Locale.US)
                val timeStr = if (date != null) timeFormat.format(date) else "--"
                txtSinceTime.text = "${getString(R.string.slot_details_since)} $timeStr ${getString(R.string.slot_details_today)}"
            } catch (e: Exception) {
                txtSinceTime.text = "${getString(R.string.slot_details_since)} --"
            }
            
            // Calculate elapsed minutes
            val elapsedMinutes = calculateElapsedMinutes(occupiedSince)
            
            // Format duration
            txtDuration.text = formatDuration(elapsedMinutes)
            
            // Calculate billing
            val billing = BillingConfig.calculateBilling(elapsedMinutes)
            txtBillingAmount.text = "${BillingConfig.CURRENCY} ${String.format("%.2f", billing.amount)}"
            txtBillingRate.text = if (billing.isOvertime) "overtime" else "flat"
        } else {
            txtSinceTime.text = "${getString(R.string.slot_details_since)} --"
            txtDuration.text = "00h : 00m : 00s"
            txtBillingAmount.text = "${BillingConfig.CURRENCY} 0.00"
            txtBillingRate.text = "flat"
        }
    }
    
    private fun calculateElapsedMinutes(occupiedSince: String): Int {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            val startTime = sdf.parse(occupiedSince.substringBefore('+').substringBefore('Z'))
            val elapsed = System.currentTimeMillis() - (startTime?.time ?: 0)
            (elapsed / 60000).toInt()
        } catch (e: Exception) {
            0
        }
    }
    
    private fun formatDuration(minutes: Int): String {
        val hours = minutes / 60
        val mins = minutes % 60
        val secs = 0 // We only track minutes from timestamp
        return String.format("%02dh : %02dm : %02ds", hours, mins, secs)
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
    
    override fun onDestroyView() {
        super.onDestroyView()
        dialogUpdateRunnable?.let { dialogUpdateHandler.removeCallbacks(it) }
        currentDialog?.dismiss()
    }
}
