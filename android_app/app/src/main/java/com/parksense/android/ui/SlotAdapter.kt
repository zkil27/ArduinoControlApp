package com.parksense.android.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.parksense.android.R
import com.parksense.android.data.models.ParkingSlot

class SlotAdapter(
    private var slots: List<ParkingSlot> = emptyList(),
    private val onSlotClick: (ParkingSlot) -> Unit = {}
) : RecyclerView.Adapter<SlotAdapter.SlotViewHolder>() {
    
    fun updateSlots(newSlots: List<ParkingSlot>) {
        slots = newSlots
        notifyDataSetChanged()
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SlotViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_slot_card, parent, false)
        return SlotViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: SlotViewHolder, position: Int) {
        holder.bind(slots[position], onSlotClick)
    }
    
    override fun getItemCount(): Int = slots.size
    
    class SlotViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val slotNameText: TextView = itemView.findViewById(R.id.slotNameText)
        private val statusText: TextView = itemView.findViewById(R.id.statusText)
        private val timerText: TextView = itemView.findViewById(R.id.timerText)
        private val circularProgress: com.parksense.android.ui.views.CircularProgressView = 
            itemView.findViewById(R.id.circularProgress)
        
        fun bind(slot: ParkingSlot, onSlotClick: (ParkingSlot) -> Unit) {
            slotNameText.text = slot.name
            
            val status = slot.slotStatus?.status ?: "vacant"
            statusText.text = status.uppercase()
            
            // Set status color - matching frontend exactly
            val statusColor = when (status) {
                "occupied" -> "#42bc2b"  // Green
                "overtime" -> "#ba2d2d"  // Red
                "disabled" -> "#d1d1d1ff" // Light gray for disabled
                else -> "#444444"        // Dark gray for vacant
            }
            statusText.setTextColor(android.graphics.Color.parseColor(statusColor))
            
            // Calculate and display timer if occupied
            if (status == "occupied" || status == "overtime") {
                slot.slotStatus?.occupiedSince?.let { occupiedSince ->
                    val elapsedMinutes = calculateElapsedMinutes(occupiedSince)
                    timerText.text = formatDuration(elapsedMinutes)
                    timerText.visibility = View.VISIBLE
                    
                    // Calculate progress
                    val progress = if (slot.allowedMinutes > 0) {
                        (elapsedMinutes.toFloat() / slot.allowedMinutes).coerceIn(0f, 1f)
                    } else {
                        0f
                    }
                    
                    circularProgress.setProgress(
                        progress = progress,
                        isOvertime = status == "overtime",
                        isVacant = false,
                        isDisabled = false
                    )
                }
            } else {
                timerText.text = "00h:00m:00s"
                timerText.visibility = View.VISIBLE
                
                circularProgress.setProgress(
                    progress = 0f,
                    isOvertime = false,
                    isVacant = status == "vacant",
                    isDisabled = status == "disabled" || slot.isDisabled
                )
            }
            
            // Set click listener
            itemView.setOnClickListener {
                onSlotClick(slot)
            }
        }
        
        private fun calculateElapsedMinutes(occupiedSince: String): Int {
            return try {
                val startTime = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                    .parse(occupiedSince.substringBefore('+').substringBefore('Z'))
                val elapsed = System.currentTimeMillis() - (startTime?.time ?: 0)
                (elapsed / 60000).toInt()
            } catch (e: Exception) {
                0
            }
        }
        
        private fun formatDuration(minutes: Int): String {
            val hours = minutes / 60
            val mins = minutes % 60
            return String.format("%02dh:%02dm:00s", hours, mins)
        }
    }
}
