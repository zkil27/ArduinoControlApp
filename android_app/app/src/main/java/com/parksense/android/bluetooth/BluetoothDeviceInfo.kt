package com.parksense.android.bluetooth

data class BluetoothDeviceInfo(
    val name: String,
    val address: String,
    val isPaired: Boolean,
    val rssi: Int? = null
) {
    val displayName: String
        get() = name.ifEmpty { "Unknown Device" }
}
