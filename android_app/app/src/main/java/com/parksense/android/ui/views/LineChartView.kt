package com.parksense.android.ui.views

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View

/**
 * Custom line chart view for Peak Hours display
 * Matches the React Native PeakHoursChart component
 */
class LineChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var hourlyData: IntArray = intArrayOf()
    private val startHour = 6  // 6AM
    private val endHour = 23   // 11PM

    // Line paint (pink/magenta like React)
    private val linePaint = Paint().apply {
        color = android.graphics.Color.parseColor("#d41f7c")
        strokeWidth = 4f
        style = Paint.Style.STROKE
        isAntiAlias = true
        strokeCap = Paint.Cap.ROUND
    }

    // Dot paint
    private val dotPaint = Paint().apply {
        color = android.graphics.Color.parseColor("#d41f7c")
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    // Y-axis label paint
    private val yLabelPaint = Paint().apply {
        color = android.graphics.Color.WHITE
        textSize = 24f
        textAlign = Paint.Align.RIGHT
        isAntiAlias = true
    }

    // X-axis label paint
    private val xLabelPaint = Paint().apply {
        color = android.graphics.Color.parseColor("#ededed")
        textSize = 24f
        textAlign = Paint.Align.CENTER
        isAntiAlias = true
    }

    // No data text paint
    private val noDataPaint = Paint().apply {
        color = android.graphics.Color.parseColor("#666666")
        textSize = 28f
        textAlign = Paint.Align.CENTER
        isAntiAlias = true
    }

    fun setData(data: IntArray) {
        hourlyData = data
        invalidate()
    }

    fun setDataFromSessions(sessionHours: List<Int>) {
        val hours = endHour - startHour + 1
        val counts = IntArray(hours) { 0 }
        
        sessionHours.forEach { hour ->
            val idx = hour - startHour
            if (idx in 0 until hours) {
                counts[idx]++
            }
        }
        
        setData(counts)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val paddingLeft = 35f
        val paddingRight = 15f
        val paddingTop = 10f
        val paddingBottom = 35f
        
        val chartWidth = width - paddingLeft - paddingRight
        val chartHeight = height - paddingTop - paddingBottom
        
        // Always have 18 data points (6AM to 11PM = hours 6-23)
        val numHours = endHour - startHour + 1  // 18 hours
        val pointSpacing = if (numHours > 1) chartWidth / (numHours - 1) else chartWidth
        
        // Get max value for scaling (minimum 5)
        val maxVal = if (hourlyData.isEmpty()) 5 else maxOf(hourlyData.maxOrNull() ?: 5, 5)

        if (hourlyData.isEmpty()) {
            // Draw "No data" message
            val centerX = width / 2f
            val centerY = height / 2f
            canvas.drawText("No session data yet", centerX, centerY, noDataPaint)
            return
        }
        
        // Calculate points for all hours
        val points = hourlyData.mapIndexed { i, value ->
            val x = paddingLeft + i * pointSpacing
            val y = paddingTop + chartHeight - (value.toFloat() / maxVal) * chartHeight
            Pair(x, y)
        }
        
        // Draw Y-axis labels (5 levels)
        val yStep = maxOf(maxVal / 5, 1)
        for (i in 0..4) {
            val labelValue = (5 - i) * yStep
            val y = paddingTop + (i / 4f) * chartHeight
            canvas.drawText(labelValue.toString(), paddingLeft - 8f, y + 6f, yLabelPaint)
        }
        
        // Draw X-axis labels at correct positions (every 3 hours: 6, 9, 12, 15, 18, 21)
        val xLabels = mapOf(
            0 to "6AM",    // Index 0 = hour 6
            3 to "9AM",    // Index 3 = hour 9
            6 to "12PM",   // Index 6 = hour 12
            9 to "3PM",    // Index 9 = hour 15
            12 to "6PM",   // Index 12 = hour 18
            15 to "9PM"    // Index 15 = hour 21
        )
        
        xLabels.forEach { (dataIdx, label) ->
            if (dataIdx < hourlyData.size) {
                val x = paddingLeft + dataIdx * pointSpacing
                canvas.drawText(label, x, height - 8f, xLabelPaint)
            }
        }
        
        // Draw line path
        if (points.size > 1) {
            val path = Path()
            path.moveTo(points[0].first, points[0].second)
            for (i in 1 until points.size) {
                path.lineTo(points[i].first, points[i].second)
            }
            canvas.drawPath(path, linePaint)
        }
        
        // Draw dots at data points with non-zero values
        points.forEachIndexed { i, (x, y) ->
            if (hourlyData[i] > 0) {
                canvas.drawCircle(x, y, 6f, dotPaint)
            }
        }
    }
}
