package com.parksense.android.ui.fragments

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.parksense.android.R
import com.parksense.android.data.models.ParkingSession
import com.parksense.android.data.repository.ParkingRepository
import com.parksense.android.ui.adapter.SessionAdapter
import com.parksense.android.ui.views.LineChartView
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class StatisticsFragment : Fragment() {
    
    private lateinit var dateText: TextView
    private lateinit var revenueText: TextView
    private lateinit var usageRateText: TextView
    private lateinit var sessionsText: TextView
    private lateinit var sessionsList: RecyclerView
    private lateinit var emptySessionsText: TextView
    private lateinit var peakHoursText: TextView
    private lateinit var peakHoursChart: LineChartView
    private lateinit var logsText: TextView
    
    private val repository = ParkingRepository()
    private val sessionAdapter = SessionAdapter()
    private val handler = Handler(Looper.getMainLooper())
    private var startTime = System.currentTimeMillis()
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_statistics, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Initialize views
        dateText = view.findViewById(R.id.dateText)
        revenueText = view.findViewById(R.id.revenueText)
        usageRateText = view.findViewById(R.id.usageRateText)
        sessionsText = view.findViewById(R.id.sessionsText)
        sessionsList = view.findViewById(R.id.sessionsList)
        emptySessionsText = view.findViewById(R.id.emptySessionsText)
        peakHoursText = view.findViewById(R.id.peakHoursText)
        peakHoursChart = view.findViewById(R.id.peakHoursChart)
        logsText = view.findViewById(R.id.logsText)
        
        // Setup RecyclerView
        sessionsList.layoutManager = LinearLayoutManager(context)
        sessionsList.adapter = sessionAdapter
        
        // Set current date
        updateDate()
        
        // Start uptime ticker
        startUptimeTicker()
        
        // Fetch data
        fetchSessions()
    }
    
    private fun updateDate() {
        val now = Date()
        val months = arrayOf("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC")
        val calendar = Calendar.getInstance()
        calendar.time = now
        
        val month = months[calendar.get(Calendar.MONTH)]
        val day = String.format("%02d", calendar.get(Calendar.DAY_OF_MONTH))
        val year = calendar.get(Calendar.YEAR)
        
        dateText.text = "$month:$day:$year"
    }
    
    private fun fetchSessions() {
        viewLifecycleOwner.lifecycleScope.launch {
            val result = repository.fetchParkingSessions(50)
            
            result.onSuccess { sessions ->
                updateUI(sessions)
            }.onFailure { error ->
                addLog("SYS", "Failed to fetch sessions: ${error.message}")
            }
        }
    }
    
    private fun updateUI(sessions: List<ParkingSession>) {
        // Calculate today's stats
        val stats = repository.calculateTodayStats(sessions)
        
        // Update stats display
        usageRateText.text = "${stats.usageRate}%"
        sessionsText.text = stats.totalSessions.toString()
        revenueText.text = String.format(Locale.US, "₱%.2f", stats.totalRevenue)
        
        // Update session history (show last 4)
        val recentSessions = sessions.take(4)
        if (recentSessions.isEmpty()) {
            sessionsList.visibility = View.GONE
            emptySessionsText.visibility = View.VISIBLE
        } else {
            sessionsList.visibility = View.VISIBLE
            emptySessionsText.visibility = View.GONE
            sessionAdapter.submitList(recentSessions)
        }
        
        // Update peak hours (simplified text version)
        updatePeakHours(sessions)
        
        addLog("SYS", "Loaded ${sessions.size} sessions")
    }
    
    private fun updatePeakHours(sessions: List<ParkingSession>) {
        // Extract hours from session start times (convert UTC to local timezone)
        val sessionHours = mutableListOf<Int>()
        sessions.forEach { session ->
            try {
                // Parse ISO 8601 timestamp - handle both +00:00 and Z formats
                val timestamp = session.startedAt
                    .replace("Z", "+00:00")  // Normalize Z to +00:00
                
                // Use ISO 8601 format with timezone
                val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.getDefault())
                val date = format.parse(timestamp)
                
                date?.let {
                    // Calendar will automatically use local timezone
                    val calendar = Calendar.getInstance()
                    calendar.time = it
                    val hour = calendar.get(Calendar.HOUR_OF_DAY)
                    sessionHours.add(hour)
                }
            } catch (e: Exception) {
                // Try fallback parsing for timestamps without timezone
                try {
                    val cleanTimestamp = session.startedAt.substringBefore('+').substringBefore('Z')
                    val fallbackFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                    fallbackFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")
                    val date = fallbackFormat.parse(cleanTimestamp)
                    date?.let {
                        val calendar = Calendar.getInstance()
                        calendar.time = it
                        val hour = calendar.get(Calendar.HOUR_OF_DAY)
                        sessionHours.add(hour)
                    }
                } catch (e2: Exception) {
                    // Ignore parsing errors
                }
            }
        }
        
        // Update the chart with session hours
        peakHoursChart.setDataFromSessions(sessionHours)
    }
    
    private fun startUptimeTicker() {
        val runnable = object : Runnable {
            override fun run() {
                if (isAdded && view != null) {
                    val elapsed = System.currentTimeMillis() - startTime
                    val hours = (elapsed / 3600000).toInt()
                    val mins = ((elapsed % 3600000) / 60000).toInt()
                    val secs = ((elapsed % 60000) / 1000).toInt()
                    val uptime = String.format("%02d:%02d:%02d", hours, mins, secs)
                    
                    val currentTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                    val logText = "$currentTime ● [SYS] UPTIME $uptime"
                    
                    logsText.text = logText
                    
                    handler.postDelayed(this, 1000)
                }
            }
        }
        handler.post(runnable)
    }
    
    private fun addLog(type: String, message: String) {
        val currentTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val newLog = "$currentTime ● [$type] $message\n"
        val currentLogs = logsText.text.toString()
        logsText.text = newLog + currentLogs
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        handler.removeCallbacksAndMessages(null)
    }
}
