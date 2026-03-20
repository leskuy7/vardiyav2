package com.vardiya.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.vardiya.android.ui.VardiyaApp
import com.vardiya.android.ui.theme.VardiyaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as VardiyaApplication).container
        setContent {
            VardiyaTheme {
                VardiyaApp(container = container)
            }
        }
    }
}
