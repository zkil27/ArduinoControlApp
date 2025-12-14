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

    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 12f
        color = android.graphics.Color.parseColor("#2a2a2a")
    }

    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 12f
        strokeCap = Paint.Cap.ROUND
    }

    private val rect = RectF()
    private var progress: Float = 0f
    private var isOvertime: Boolean = false
    private var isVacant: Boolean = false
    private var isDisabled: Boolean = false

    init {
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
        progressPaint.color = when {
            isDisabled -> android.graphics.Color.parseColor("#444444")
            isVacant -> android.graphics.Color.parseColor("#444444")
            isOvertime -> android.graphics.Color.parseColor("#ba2d2d")
            else -> android.graphics.Color.parseColor("#42bc2b")
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val size = minOf(width, height).toFloat()
        val padding = progressPaint.strokeWidth / 2
        
        rect.set(
            padding,
            padding,
            size - padding,
            size - padding
        )

        // Draw background circle
        canvas.drawCircle(
            size / 2,
            size / 2,
            (size / 2) - padding,
            backgroundPaint
        )

        // Draw progress arc
        if (progress > 0 && !isVacant && !isDisabled) {
            val sweepAngle = 360f * progress
            canvas.drawArc(rect, -90f, sweepAngle, false, progressPaint)
        }
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val size = 80.dpToPx()
        setMeasuredDimension(size, size)
    }

    private fun Int.dpToPx(): Int {
        return (this * resources.displayMetrics.density).toInt()
    }
}
