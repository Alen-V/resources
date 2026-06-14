package com.monorepotemplate.android.designsystem.theme

fun String.hexToColorInt(): Int {
    val hex = this.removePrefix("#")
    return when (hex.length) {
        6 -> {
            val rgb = hex.toLong(16).toInt()
            (0xFF shl 24) or rgb
        }
        8 -> {
            val r = hex.substring(0, 2).toInt(16)
            val g = hex.substring(2, 4).toInt(16)
            val b = hex.substring(4, 6).toInt(16)
            val a = hex.substring(6, 8).toInt(16)
            (a shl 24) or (r shl 16) or (g shl 8) or b
        }
        else -> throw IllegalArgumentException("Invalid hex color: $this")
    }
}
