package com.example.docare

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class RegistActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        //enableEdgeToEdge()
        setContentView(R.layout.activity_regist)
        /*ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }*/
        val btnRegistDB: Button = findViewById(R.id.btn_regist_db)
        btnRegistDB.setOnClickListener(this)

        val btnRegistGoogle: Button = findViewById(R.id.btn_regist_google)
        btnRegistGoogle.setOnClickListener(this)
    }

    override fun onClick(v: View?) {
        when (v?.id) {
            R.id.btn_regist_db -> {
                val saveData = Intent(this@RegistActivity, MoveActivity::class.java)
                startActivity(saveData)
            }
            R.id.btn_regist_google -> {
                val saveAcc = Intent(this@RegistActivity, MoveActivity::class.java)
                startActivity(saveAcc)
            }
}