package com.parksense.android.ui.fragments

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.parksense.android.R

class SettingsFragment : Fragment() {
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_settings, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupButtons(view)
    }
    
    private fun setupButtons(view: View) {
        val btnManualControl = view.findViewById<Button>(R.id.btnManualControl)
        val btnDevMode = view.findViewById<Button>(R.id.btnDevMode)
        val btnExportStats = view.findViewById<Button>(R.id.btnExportStats)
        val btnAboutUs = view.findViewById<Button>(R.id.btnAboutUs)
        val btnBack = view.findViewById<Button>(R.id.btnBack)
        
        // Manual Control - Opens manual controls screen
        btnManualControl.setOnClickListener {
            val mainActivity = activity as? com.parksense.android.MainActivity
            mainActivity?.showManualControl()
        }
        
        // Dev Mode - Toggle developer features (placeholder)
        btnDevMode.setOnClickListener {
            Toast.makeText(requireContext(), "Dev Mode - Coming soon", Toast.LENGTH_SHORT).show()
        }
        
        // Export Statistics - Export data to CSV/JSON (placeholder)
        btnExportStats.setOnClickListener {
            Toast.makeText(requireContext(), "Export Statistics - Coming soon", Toast.LENGTH_SHORT).show()
        }
        
        // About Us - Show about dialog
        btnAboutUs.setOnClickListener {
            showAboutDialog()
        }
        
        // Back - Navigate back (uses toggle to properly reset settings state)
        btnBack.setOnClickListener {
            val mainActivity = activity as? com.parksense.android.MainActivity
            mainActivity?.exitSettings()
        }
    }
    
    private fun showAboutDialog() {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_about, null)
        
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .setCancelable(true)
            .create()
        
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        
        // Close button
        dialogView.findViewById<View>(R.id.btnCloseAbout)?.setOnClickListener {
            dialog.dismiss()
        }
        
        dialog.show()
    }
}
