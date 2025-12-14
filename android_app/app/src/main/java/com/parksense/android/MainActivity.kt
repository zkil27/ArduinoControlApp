package com.parksense.android

import android.Manifest
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.parksense.android.bluetooth.BluetoothDeviceInfo
import com.parksense.android.bluetooth.BluetoothManager
import com.parksense.android.ui.adapter.BluetoothDeviceAdapter
import com.parksense.android.ui.fragments.DashboardFragment
import com.parksense.android.ui.fragments.SettingsFragment
import com.parksense.android.ui.fragments.StatisticsFragment
import com.parksense.android.ui.views.CustomBottomNavigation

class MainActivity : AppCompatActivity() {
    
    private lateinit var bluetoothStatusText: TextView
    private lateinit var bluetoothHeaderLayout: View
    private lateinit var bottomNav: CustomBottomNavigation
    
    private lateinit var bluetoothManager: BluetoothManager
    private var currentDialog: AlertDialog? = null
    
    // Permission launcher for Bluetooth
    private val bluetoothPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.values.all { it }
        if (allGranted) {
            showBluetoothDeviceDialog()
        } else {
            Toast.makeText(this, R.string.bluetooth_permission_required, Toast.LENGTH_LONG).show()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enable Edge-to-Edge
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, false)
        
        setContentView(R.layout.activity_main)
        
        bluetoothManager = BluetoothManager(this)
        
        setupViews()
        setupWindowInsets()
        setupBottomNavigation()
        
        // Load default fragment
        if (savedInstanceState == null) {
            loadFragment(DashboardFragment())
        }
        
        // Check initial Bluetooth status
        updateBluetoothStatus()
    }
    
    private fun setupWindowInsets() {
        val bluetoothHeader = findViewById<View>(R.id.bluetoothHeaderLayout)
        val initialPaddingTop = bluetoothHeader.paddingTop
        
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(bluetoothHeader) { view, windowInsets ->
            val insets = windowInsets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars())
            // Add top inset to INITIAL padding (prevents cumulative growth)
            view.setPadding(
                view.paddingLeft,
                initialPaddingTop + insets.top,
                view.paddingRight,
                view.paddingBottom
            )
            androidx.core.view.WindowInsetsCompat.CONSUMED
        }
    }
    
    private fun setupViews() {
        bluetoothStatusText = findViewById(R.id.bluetoothStatus)
        bottomNav = findViewById(R.id.bottomNavigation)
        bluetoothHeaderLayout = findViewById(R.id.bluetoothHeaderLayout)
        
        // Set click listener for Bluetooth status
        val statusContainer = findViewById<View>(R.id.bluetoothStatusContainer)
        statusContainer.setOnClickListener {
            onBluetoothHeaderClick()
        }
        
        // Set click listener for settings icon
        val settingsIcon = findViewById<View>(R.id.settingsIcon)
        settingsIcon?.setOnClickListener {
            // Navigate to settings - placeholder for now
            Toast.makeText(this, "Settings", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun setupBottomNavigation() {
        bottomNav.setOnTabSelectedListener { index ->
            when (index) {
                0 -> loadFragment(DashboardFragment())
                1 -> loadFragment(StatisticsFragment())
            }
        }
    }
    
    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }
    
    private fun onBluetoothHeaderClick() {
        // Check if Bluetooth is supported
        if (!bluetoothManager.isBluetoothSupported()) {
            Toast.makeText(this, R.string.bluetooth_not_supported, Toast.LENGTH_SHORT).show()
            return
        }
        
        // Check if Bluetooth is enabled
        if (!bluetoothManager.isBluetoothEnabled()) {
            // Prompt user to enable Bluetooth
            val enableBtIntent = Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE)
            startActivity(enableBtIntent)
            Toast.makeText(this, R.string.bluetooth_not_enabled, Toast.LENGTH_SHORT).show()
            return
        }
        
        // Check permissions
        if (!hasRequiredPermissions()) {
            requestBluetoothPermissions()
            return
        }
        
        // Show device selection dialog
        showBluetoothDeviceDialog()
    }
    
    private fun hasRequiredPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        } else {
            ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun requestBluetoothPermissions() {
        val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        }
        
        bluetoothPermissionLauncher.launch(permissions)
    }
    
    private fun showBluetoothDeviceDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_bluetooth_devices, null)
        
        val recyclerDevices = dialogView.findViewById<RecyclerView>(R.id.recyclerDevices)
        val txtNoDevices = dialogView.findViewById<TextView>(R.id.txtNoDevices)
        val btnScan = dialogView.findViewById<Button>(R.id.btnScan)
        val btnCancel = dialogView.findViewById<Button>(R.id.btnCancel)
        val progressScanning = dialogView.findViewById<ProgressBar>(R.id.progressScanning)
        val txtScanStatus = dialogView.findViewById<TextView>(R.id.txtScanStatus)
        
        // Setup RecyclerView
        val deviceAdapter = BluetoothDeviceAdapter(emptyList()) { device ->
            onDeviceSelected(device)
        }
        recyclerDevices.layoutManager = LinearLayoutManager(this)
        recyclerDevices.adapter = deviceAdapter
        
        // Load paired devices initially
        val pairedDevices = bluetoothManager.getPairedDevices()
        if (pairedDevices.isNotEmpty()) {
            deviceAdapter.updateDevices(pairedDevices)
            recyclerDevices.visibility = View.VISIBLE
            txtNoDevices.visibility = View.GONE
        } else {
            recyclerDevices.visibility = View.GONE
            txtNoDevices.visibility = View.VISIBLE
        }
        
        // Scan button
        var isScanning = false
        btnScan.setOnClickListener {
            if (isScanning) {
                // Stop scanning
                bluetoothManager.stopDiscovery()
                isScanning = false
                btnScan.text = getString(R.string.bluetooth_scan)
                progressScanning.visibility = View.GONE
                txtScanStatus.visibility = View.GONE
            } else {
                // Start scanning
                isScanning = true
                btnScan.text = getString(R.string.bluetooth_stop_scan)
                progressScanning.visibility = View.VISIBLE
                txtScanStatus.visibility = View.VISIBLE
                
                bluetoothManager.startDiscovery { devices ->
                    runOnUiThread {
                        if (devices.isNotEmpty()) {
                            deviceAdapter.updateDevices(devices)
                            recyclerDevices.visibility = View.VISIBLE
                            txtNoDevices.visibility = View.GONE
                        }
                    }
                }
            }
        }
        
        // Create and show dialog
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()
        
        btnCancel.setOnClickListener {
            if (isScanning) {
                bluetoothManager.stopDiscovery()
            }
            dialog.dismiss()
        }
        
        dialog.setOnDismissListener {
            if (isScanning) {
                bluetoothManager.stopDiscovery()
            }
            currentDialog = null
        }
        
        currentDialog = dialog
        dialog.show()
    }
    
    private fun onDeviceSelected(device: BluetoothDeviceInfo) {
        currentDialog?.dismiss()
        
        // Show connecting status
        bluetoothStatusText.text = "Connecting..."
        bluetoothStatusText.setTextColor(getColor(R.color.status_occupied))
        
        // Connect to device
        bluetoothManager.connectToDevice(device.address) { success, error ->
            runOnUiThread {
                if (success) {
                    Toast.makeText(this, "Connected to ${device.displayName}", Toast.LENGTH_SHORT).show()
                    updateBluetoothStatus()
                } else {
                    Toast.makeText(this, error ?: getString(R.string.bluetooth_connection_failed), Toast.LENGTH_LONG).show()
                    updateBluetoothStatus()
                }
            }
        }
    }
    
    private fun updateBluetoothStatus() {
        val isConnected = bluetoothManager.isConnected()
        
        if (isConnected) {
            bluetoothStatusText.text = "Strong Connection"
            bluetoothStatusText.setTextColor(android.graphics.Color.parseColor("#42bc2b"))  // Green
        } else {
            bluetoothStatusText.text = "Disconnected"
            bluetoothStatusText.setTextColor(android.graphics.Color.parseColor("#444444"))  // Gray
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        bluetoothManager.cleanup()
    }
}
