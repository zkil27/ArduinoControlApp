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
    private val onDeviceClick: (BluetoothDeviceInfo) -> Unit
) : RecyclerView.Adapter<BluetoothDeviceAdapter.DeviceViewHolder>() {

    inner class DeviceViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val txtDeviceName: TextView = itemView.findViewById(R.id.txtDeviceName)
        private val txtDeviceAddress: TextView = itemView.findViewById(R.id.txtDeviceAddress)
        private val txtPairedBadge: TextView = itemView.findViewById(R.id.txtPairedBadge)
        private val layoutRssi: View = itemView.findViewById(R.id.layoutRssi)
        private val txtRssi: TextView = itemView.findViewById(R.id.txtRssi)

        fun bind(device: BluetoothDeviceInfo) {
            txtDeviceName.text = device.displayName
            txtDeviceAddress.text = device.address
            
            // Show paired badge if device is paired
            txtPairedBadge.visibility = if (device.isPaired) View.VISIBLE else View.GONE
            
            // Show RSSI if available
            if (device.rssi != null) {
                layoutRssi.visibility = View.VISIBLE
                txtRssi.text = "${device.rssi} dBm"
            } else {
                layoutRssi.visibility = View.GONE
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
}
