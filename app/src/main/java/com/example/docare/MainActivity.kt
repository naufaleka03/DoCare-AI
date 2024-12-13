package com.example.docare

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.Composable
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.example.docare.ui.login.LoginActivity
import com.example.docare.ui.login.LoginActivity2

class MainActivity : AppCompatActivity(), View.OnClickListener {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        //enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        /*ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }*/

        val btnLoginActivity: Button = findViewById(R.id.btn_login_head)
        btnLoginActivity.setOnClickListener(this)

        val btnCreateAccount: Button = findViewById(R.id.btn_create_acc)
        btnCreateAccount.setOnClickListener(this)

        val blurbTextView: TextView = findViewById(R.id.str_title_blurb)

    }

    override fun onClick(v: View?) {
        when (v?.id) {
            R.id.btn_login_head -> {
                val moveLogin = Intent(this@MainActivity, LoginActivity::class.java)
                startActivity(moveLogin)
            }
            R.id.btn_create_acc -> {
                val moveSignup = Intent(this@MainActivity, RegistActivity::class.java)
                startActivity(moveSignup)
            }
        }
    }
}

