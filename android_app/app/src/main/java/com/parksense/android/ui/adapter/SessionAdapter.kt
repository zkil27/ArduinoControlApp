package com.parksense.android.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.parksense.android.R
import com.parksense.android.data.models.ParkingSession
import java.util.Locale

class SessionAdapter : ListAdapter<ParkingSession, SessionAdapter.SessionViewHolder>(SessionDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SessionViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_session, parent, false) as TextView
        return SessionViewHolder(view)
    }

    override fun onBindViewHolder(holder: SessionViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class SessionViewHolder(private val textView: TextView) : RecyclerView.ViewHolder(textView) {
        
        fun bind(session: ParkingSession) {
            val id = "..${session.id.takeLast(4)}"
            val slot = session.slotName.padEnd(5)
            val duration = formatDuration(session.durationMinutes).padEnd(6)
            val amount = String.format(Locale.US, "%.2f", session.amountCharged)
            val overtime = if (session.wasOvertime) "*" else ""
            
            textView.text = "$id   $slot $duration $amount$overtime"
        }
        
        private fun formatDuration(minutes: Int): String {
            return when {
                minutes < 60 -> "${minutes}m"
                minutes % 60 == 0 -> "${minutes / 60}h"
                else -> String.format(Locale.US, "%.1fh", minutes / 60.0)
            }
        }
    }

    class SessionDiffCallback : DiffUtil.ItemCallback<ParkingSession>() {
        override fun areItemsTheSame(oldItem: ParkingSession, newItem: ParkingSession) = 
            oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: ParkingSession, newItem: ParkingSession) = 
            oldItem == newItem
    }
}
