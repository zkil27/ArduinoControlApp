package com.parksense.android.ui.views

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.util.AttributeSet
import android.view.LayoutInflater
import android.widget.LinearLayout
import android.widget.TextView
import android.view.animation.DecelerateInterpolator
import com.parksense.android.R

class CustomBottomNavigation @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    private val tabDashboard: TextView
    private val tabStatistics: TextView
    private val sliderBackground: android.view.View
    private val bottomLine: android.view.View
    
    private var currentTab = 0
    private var onTabSelectedListener: ((Int) -> Unit)? = null
    
    // Colors matching frontend
    private val colorBlue = Color.parseColor("#1F4FCE")
    private val colorPink = Color.parseColor("#c3257a")
    
    init {
        LayoutInflater.from(context).inflate(R.layout.custom_bottom_navigation, this, true)
        
        tabDashboard = findViewById(R.id.tabDashboard)
        tabStatistics = findViewById(R.id.tabStatistics)
        sliderBackground = findViewById(R.id.sliderBackground)
        bottomLine = findViewById(R.id.bottomLine)
        
        setupClickListeners()
        updateTabSelection(0, false)
    }
    
    private fun setupClickListeners() {
        tabDashboard.setOnClickListener {
            selectTab(0)
        }
        
        tabStatistics.setOnClickListener {
            selectTab(1)
        }
    }
    
    fun selectTab(index: Int, animate: Boolean = true) {
        if (index == currentTab) return
        
        val oldTab = currentTab
        currentTab = index
        
        updateTabSelection(index, animate)
        onTabSelectedListener?.invoke(index)
    }
    
    private fun updateTabSelection(index: Int, animate: Boolean) {
        // Get container width
        post {
            val containerWidth = width
            if (containerWidth == 0) return@post
            
            val tabWidth = containerWidth / 2
            // Center the slider: offset is 10dp (half of the 20dp difference in width)
            val offset = dpToPx(10)
            val targetX = (index * tabWidth) + offset
            
            // Calculate start and end X for color interpolation
            val startX = offset.toFloat()
            val endX = (tabWidth + offset).toFloat()
            val totalDistance = endX - startX
            
            if (animate) {
                // Animate slider position
                val currentX = sliderBackground.x
                ValueAnimator.ofFloat(currentX, targetX.toFloat()).apply {
                    duration = 300
                    interpolator = DecelerateInterpolator()
                    addUpdateListener { animation ->
                        val value = animation.animatedValue as Float
                        sliderBackground.x = value
                        
                        // Interpolate gradient color (0.0 to 1.0)
                        val fraction = if (totalDistance > 0) (value - startX) / totalDistance else 0f
                        // Clamp fraction between 0 and 1
                        val clampedFraction = fraction.coerceIn(0f, 1f)
                        updateGradientColor(clampedFraction)
                    }
                    start()
                }
            } else {
                sliderBackground.x = targetX.toFloat()
                // Interpolate gradient color
                val fraction = if (totalDistance > 0) (targetX.toFloat() - startX) / totalDistance else 0f
                val clampedFraction = fraction.coerceIn(0f, 1f)
                updateGradientColor(clampedFraction)
            }
        }
    }
    
    private fun updateGradientColor(fraction: Float) {
        // Interpolate between blue and pink
        val red = interpolateColor(
            (colorBlue shr 16) and 0xFF,
            (colorPink shr 16) and 0xFF,
            fraction
        )
        val green = interpolateColor(
            (colorBlue shr 8) and 0xFF,
            (colorPink shr 8) and 0xFF,
            fraction
        )
        val blue = interpolateColor(
            colorBlue and 0xFF,
            colorPink and 0xFF,
            fraction
        )
        
        val interpolatedColor = Color.rgb(red, green, blue)
        
        // Update slider background
        (sliderBackground.background as? GradientDrawable)?.setColor(interpolatedColor)
        
        // Update bottom line
        (bottomLine.background as? GradientDrawable)?.setColor(interpolatedColor)
    }
    
    private fun interpolateColor(start: Int, end: Int, fraction: Float): Int {
        return (start + fraction * (end - start)).toInt()
    }
    
    fun setOnTabSelectedListener(listener: (Int) -> Unit) {
        this.onTabSelectedListener = listener
    }
    
    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        super.onLayout(changed, l, t, r, b)
        
        if (changed) {
            // Update slider width to match tab width
            val containerWidth = width
            val tabWidth = containerWidth / 2
            val sliderWidth = tabWidth - dpToPx(20)
            
            val params = sliderBackground.layoutParams
            params.width = sliderWidth
            sliderBackground.layoutParams = params
            
            // Position slider correctly
            updateTabSelection(currentTab, false)
        }
    }
    
    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }
}
