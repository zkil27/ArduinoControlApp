package com.parksense.android

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.parksense.android.ui.fragments.DashboardFragment
import com.parksense.android.ui.fragments.SettingsFragment
import com.parksense.android.ui.fragments.StatisticsFragment

class MainActivity : AppCompatActivity() {
    
    private lateinit var bluetoothStatusText: TextView
    private lateinit var rssiText: TextView
    private lateinit var bottomNav: BottomNavigationView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        setupViews()
        setupBottomNavigation()
        
        // Load default fragment
        if (savedInstanceState == null) {
            loadFragment(DashboardFragment())
        }
    }
    
    private fun setupViews() {
        bluetoothStatusText = findViewById(R.id.bluetoothStatus)
        rssiText = findViewById(R.id.rssiValue)
        bottomNav = findViewById(R.id.bottomNavigation)
        
        // Set initial Bluetooth status
        updateBluetoothStatus(false, null)
    }
    
    private fun setupBottomNavigation() {
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_dashboard -> {
                    loadFragment(DashboardFragment())
                    true
                }
                R.id.nav_statistics -> {
                    loadFragment(StatisticsFragment())
                    true
                }
                R.id.nav_settings -> {
                    loadFragment(SettingsFragment())
                    true
                }
                else -> false
            }
        }
    }
    
    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }
    
    private fun updateBluetoothStatus(isConnected: Boolean, rssi: Int?) {
        if (isConnected) {
            bluetoothStatusText.text = "Connected"
            bluetoothStatusText.setTextColor(getColor(R.color.accent_green))
            rssiText.text = "${rssi ?: "--"} dBm"
        } else {
            bluetoothStatusText.text = "Disconnected"
            bluetoothStatusText.setTextColor(getColor(R.color.status_overtime))
            rssiText.text = "-- dBm"
        }
    }
}
