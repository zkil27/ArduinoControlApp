package com.parksense.android.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.parksense.android.R
import com.parksense.android.bluetooth.BluetoothDeviceInfo

class BluetoothDeviceAdapter(
    private var devices: List<BluetoothDeviceInfo>,
    private var connectedDeviceAddress: String? = null,
    private val onDeviceClick: (BluetoothDeviceInfo) -> Unit
) : RecyclerView.Adapter<BluetoothDeviceAdapter.DeviceViewHolder>() {

    inner class DeviceViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val txtDeviceName: TextView = itemView.findViewById(R.id.txtDeviceName)
        private val txtDeviceAddress: TextView = itemView.findViewById(R.id.txtDeviceAddress)
        private val txtStatus: TextView = itemView.findViewById(R.id.txtStatus)

        fun bind(device: BluetoothDeviceInfo) {
            txtDeviceName.text = device.displayName
            txtDeviceAddress.text = device.address
            
            // Check if this device is currently connected
            val isConnected = device.address == connectedDeviceAddress
            
            if (isConnected) {
                txtStatus.text = "CONNECTED"
                txtStatus.setBackgroundResource(R.drawable.badge_status_connected)
                // Apply connected border to item
                itemView.setBackgroundResource(R.drawable.item_bluetooth_connected)
            } else {
                txtStatus.text = "TAP TO CONNECT"
                txtStatus.setBackgroundResource(R.drawable.badge_status)
                itemView.setBackgroundResource(R.drawable.item_bluetooth_background)
            }
            
            // Handle click
            itemView.setOnClickListener {
                onDeviceClick(device)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DeviceViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_bluetooth_device, parent, false)
        return DeviceViewHolder(view)
    }

    override fun onBindViewHolder(holder: DeviceViewHolder, position: Int) {
        holder.bind(devices[position])
    }

    override fun getItemCount(): Int = devices.size

    fun updateDevices(newDevices: List<BluetoothDeviceInfo>) {
        devices = newDevices
        notifyDataSetChanged()
    }
    
    fun setConnectedDevice(address: String?) {
        connectedDeviceAddress = address
        notifyDataSetChanged()
    }
}
