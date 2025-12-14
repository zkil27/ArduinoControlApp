package com.parksense.android.ui.views

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View

class CircularProgressView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    // Match React Native strokeWidth = 20
    private val strokeWidthDp = 20f
    private var strokeWidthPx = 0f

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = android.graphics.Color.parseColor("#272727") // Match frontend
    }

    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.BUTT // Match frontend: strokeLinecap="butt"
    }

    private val innerCirclePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = android.graphics.Color.parseColor("#0a0909") // Card background
    }

    private val rect = RectF()
    private var progress: Float = 0f
    private var isOvertime: Boolean = false
    private var isVacant: Boolean = false
    private var isDisabled: Boolean = false

    init {
        strokeWidthPx = strokeWidthDp * resources.displayMetrics.density
        trackPaint.strokeWidth = strokeWidthPx
        progressPaint.strokeWidth = strokeWidthPx
        updateProgressColor()
    }

    fun setProgress(progress: Float, isOvertime: Boolean = false, isVacant: Boolean = false, isDisabled: Boolean = false) {
        this.progress = progress.coerceIn(0f, 1f)
        this.isOvertime = isOvertime
        this.isVacant = isVacant
        this.isDisabled = isDisabled
        updateProgressColor()
        invalidate()
    }

    private fun updateProgressColor() {
        // Match React Native getProgressColor logic
        progressPaint.color = when {
            isDisabled -> android.graphics.Color.parseColor("#444444")
            isVacant -> android.graphics.Color.parseColor("#444444")
            isOvertime -> android.graphics.Color.parseColor("#ba2d2d") // Red
            else -> {
                // Calculate remaining time percentage
                val percentRemaining = 1f - progress
                when {
                    percentRemaining > 0.5f -> android.graphics.Color.parseColor("#42bc2b") // Green
                    percentRemaining > 0.15f -> android.graphics.Color.parseColor("#1f4fce") // Blue
                    percentRemaining > 0f -> android.graphics.Color.parseColor("#c3257a") // Pink
                    else -> android.graphics.Color.parseColor("#ba2d2d") // Red
                }
            }
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val size = minOf(width, height).toFloat()
        val padding = strokeWidthPx / 2
        val center = size / 2
        val radius = (size - strokeWidthPx) / 2

        rect.set(
            padding,
            padding,
            size - padding,
            size - padding
        )

        // Draw background track circle
        canvas.drawCircle(center, center, radius, trackPaint)

        // Draw progress arc (React Native behavior: starts full, drains)
        // Visual fill = 1 - progress (if not overtime)
        // If overtime: show full ring
        if (!isVacant && !isDisabled) {
            val visualFill = if (isOvertime) 1f else (1f - progress)
            val sweepAngle = 360f * visualFill
            
            // Draw counterclockwise from top (mirror effect like React Native scaleX: -1)
            // Start at -90 (top) and sweep counterclockwise (negative angle)
            canvas.drawArc(rect, -90f, -sweepAngle, false, progressPaint)
        }

        // Draw inner circle (donut hole) - matches card background
        val innerRadius = radius - (strokeWidthPx / 2) - (4 * resources.displayMetrics.density)
        canvas.drawCircle(center, center, innerRadius, innerCirclePaint)
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        // Use the size from layout, or default to 80dp
        val desiredWidth = MeasureSpec.getSize(widthMeasureSpec)
        val desiredHeight = MeasureSpec.getSize(heightMeasureSpec)
        
        val widthMode = MeasureSpec.getMode(widthMeasureSpec)
        val heightMode = MeasureSpec.getMode(heightMeasureSpec)
        
        val defaultSize = (80 * resources.displayMetrics.density).toInt()
        
        val width = when (widthMode) {
            MeasureSpec.EXACTLY -> desiredWidth
            MeasureSpec.AT_MOST -> minOf(defaultSize, desiredWidth)
            else -> defaultSize
        }
        
        val height = when (heightMode) {
            MeasureSpec.EXACTLY -> desiredHeight
            MeasureSpec.AT_MOST -> minOf(defaultSize, desiredHeight)
            else -> defaultSize
        }
        
        setMeasuredDimension(width, height)
    }
}
