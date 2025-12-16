package com.parksense.android.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.parksense.android.MainActivity
import com.parksense.android.R
import com.parksense.android.data.repository.ParkingRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Manual Control screen - provides direct control over parking system
 */
class ManualControlFragment : Fragment() {

    private val repository = ParkingRepository()
    private val scope = CoroutineScope(Dispatchers.Main)

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_manual_control, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupClickListeners(view)
    }

    private fun setupClickListeners(view: View) {
        val mainActivity = activity as? MainActivity
        val bluetoothManager = mainActivity?.getBluetoothManager()
        
        // Entry Servo
        view.findViewById<View>(R.id.btnEntryServo)?.setOnClickListener {
            if (bluetoothManager?.isConnected() == true) {
                bluetoothManager.sendServoAngle(90) // Open entry gate
                showToast("Opening Entry Servo...")
            } else {
                showToast("Bluetooth not connected")
            }
        }
        
        // Exit Servo
        view.findViewById<View>(R.id.btnExitServo)?.setOnClickListener {
            if (bluetoothManager?.isConnected() == true) {
                bluetoothManager.sendServoAngle(90) // Open exit gate
                showToast("Opening Exit Servo...")
            } else {
                showToast("Bluetooth not connected")
            }
        }
        
        // Add Virtual Vacant Slot
        view.findViewById<View>(R.id.btnAddVacant)?.setOnClickListener {
            showToast("Adding Virtual Vacant Slot...")
            scope.launch {
                val result = repository.addVirtualSlot("vacant")
                withContext(Dispatchers.Main) {
                    result.onSuccess { slot ->
                        showToast("Added ${slot.name} (vacant)")
                    }.onFailure { e ->
                        showToast("Error: ${e.message}")
                    }
                }
            }
        }
        
        // Add Virtual Occupied Slot
        view.findViewById<View>(R.id.btnAddOccupied)?.setOnClickListener {
            showToast("Adding Virtual Occupied Slot...")
            scope.launch {
                val result = repository.addVirtualSlot("occupied")
                withContext(Dispatchers.Main) {
                    result.onSuccess { slot ->
                        showToast("Added ${slot.name} (occupied)")
                    }.onFailure { e ->
                        showToast("Error: ${e.message}")
                    }
                }
            }
        }
        
        // Ping All Devices
        view.findViewById<View>(R.id.btnPingAll)?.setOnClickListener {
            if (bluetoothManager?.isConnected() == true) {
                showToast("Pinging all devices...")
                // Ping slots P1-P5
                for (i in 1..5) {
                    bluetoothManager.pingSlot("P$i")
                }
            } else {
                showToast("Bluetooth not connected")
            }
        }
        
        // Simulate Traffic
        view.findViewById<View>(R.id.btnSimulateTraffic)?.setOnClickListener {
            showToast("Simulating Traffic...")
            scope.launch {
                val result = repository.simulateTraffic()
                withContext(Dispatchers.Main) {
                    result.onSuccess { message ->
                        showToast("Traffic: $message")
                    }.onFailure { e ->
                        showToast("Error: ${e.message}")
                    }
                }
            }
        }
        
        // Vacate All
        view.findViewById<View>(R.id.btnVacateAll)?.setOnClickListener {
            showToast("Vacating All Slots...")
            scope.launch {
                val result = repository.vacateAllSlots()
                withContext(Dispatchers.Main) {
                    result.onSuccess {
                        showToast("All slots vacated!")
                    }.onFailure { e ->
                        showToast("Error: ${e.message}")
                    }
                }
            }
        }
        
        // Remove Slot
        view.findViewById<View>(R.id.btnRemoveSlot)?.setOnClickListener {
            showToast("Removing Last Slot...")
            scope.launch {
                val result = repository.removeLastSlot()
                withContext(Dispatchers.Main) {
                    result.onSuccess {
                        showToast("Last slot removed!")
                    }.onFailure { e ->
                        showToast("Error: ${e.message}")
                    }
                }
            }
        }
        
        // Reset Slots
        view.findViewById<View>(R.id.btnResetSlots)?.setOnClickListener {
            showToast("Resetting Slots to P1-P5...")
            scope.launch {
                val result = repository.resetParkingSlots()
                withContext(Dispatchers.Main) {
                    result.onSuccess {
                        showToast("Slots reset to P1-P5!")
                    }.onFailure { e ->
                        showToast("Error: ${e.message}")
                    }
                }
            }
        }
    }
    
    private fun showToast(message: String) {
        Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
    }
}
