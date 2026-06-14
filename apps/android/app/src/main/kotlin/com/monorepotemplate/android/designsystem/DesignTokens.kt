// GENERATED FILE. Do not edit. Source: packages/design-tokens/src/

package com.monorepotemplate.android.designsystem

object DSColorLight {
    const val background = "#F6F3ED"
    const val foreground = "#121212"
    const val card = "#FBFAF8"
    const val cardForeground = "#121212"
    const val popover = "#FBFAF8"
    const val popoverForeground = "#121212"
    const val primary = "#1B1A1A"
    const val primaryForeground = "#FBFAF8"
    const val secondary = "#EFE9DC"
    const val secondaryForeground = "#1B1A1A"
    const val muted = "#EFE9DC"
    const val mutedForeground = "#50504E"
    const val accent = "#BCA575"
    const val accentForeground = "#121212"
    const val destructive = "#E7000B"
    const val border = "#E3DAC6"
    const val input = "#E3DAC6"
    const val ring = "#747371"
}

object DSColorDark {
    const val background = "#121212"
    const val foreground = "#F6F3ED"
    const val card = "#151514"
    const val cardForeground = "#F6F3ED"
    const val popover = "#151514"
    const val popoverForeground = "#F6F3ED"
    const val primary = "#BCA575"
    const val primaryForeground = "#121212"
    const val secondary = "#1B1A1A"
    const val secondaryForeground = "#F6F3ED"
    const val muted = "#1B1A1A"
    const val mutedForeground = "#E3DAC6"
    const val accent = "#747371"
    const val accentForeground = "#FBFAF8"
    const val destructive = "#FF6467"
    const val border = "#FBFAF81A"
    const val input = "#FBFAF826"
    const val ring = "#BCA575"
}

object DSSpacing {
    const val s_0: Int = 0
    const val s_1: Int = 4
    const val s_2: Int = 8
    const val s_3: Int = 12
    const val s_4: Int = 16
    const val s_5: Int = 20
    const val s_6: Int = 24
    const val s_8: Int = 32
    const val s_10: Int = 40
    const val s_12: Int = 48
    const val s_16: Int = 64
    const val s_20: Int = 80
    const val s_24: Int = 96
}

object DSRadius {
    const val base: Int = 10
    const val sm: Int = 6
    const val md: Int = 8
    const val lg: Int = 10
    const val xl: Int = 14
    const val xl2: Int = 18
    const val xl3: Int = 22
    const val xl4: Int = 26
}

object DSFontSize {
    const val display: Int = 32
    const val heading: Int = 24
    const val title: Int = 20
    const val body: Int = 16
    const val label: Int = 14
    const val caption: Int = 12
}

object DSLineHeight {
    const val display: Int = 40
    const val heading: Int = 32
    const val title: Int = 28
    const val body: Int = 24
    const val label: Int = 20
    const val caption: Int = 16
}

object DSFontWeight {
    const val display: Int = 700
    const val heading: Int = 600
    const val title: Int = 600
    const val body: Int = 400
    const val label: Int = 500
    const val caption: Int = 400
}

object DSOpacity {
    const val subtle: Float = 0.1f
    const val soft: Float = 0.3f
    const val medium: Float = 0.5f
    const val strong: Float = 0.8f
}

object DSBorderWidth {
    const val hairline: Int = 1
    const val thin: Int = 1
    const val emphasis: Int = 2
    const val focus: Int = 3
}

object DSDuration {
    const val fastMs: Int = 150
    const val baseMs: Int = 200
    const val slowMs: Int = 300
}

data class DSShadowSpec(
    val offsetX: Int,
    val offsetY: Int,
    val blur: Int,
    val spread: Int,
    val color: String,
    val alpha: Float,
)

object DSShadow {
    val sm = DSShadowSpec(0, 1, 2, 0, "#000000", 0.05f)
    val md = DSShadowSpec(0, 4, 6, 0, "#000000", 0.1f)
    val lg = DSShadowSpec(0, 10, 15, 0, "#000000", 0.1f)
    val xl = DSShadowSpec(0, 20, 25, 0, "#000000", 0.1f)
}

object DSButton {
    const val radius: Int = 8
    const val iconGap: Int = 8
    const val focusRingWidth: Int = 3
}

object DSInput {
    const val radius: Int = 8
    const val height: Int = 36
    const val paddingX: Int = 12
    const val fontSize: Int = 14
    const val borderWidth: Int = 1
}
