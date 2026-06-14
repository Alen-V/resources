package com.monorepotemplate.android.designsystem.theme

import com.monorepotemplate.android.designsystem.DSColorDark
import com.monorepotemplate.android.designsystem.DSColorLight
import com.monorepotemplate.android.designsystem.DSDuration
import com.monorepotemplate.android.designsystem.DSFontSize
import com.monorepotemplate.android.designsystem.DSRadius
import com.monorepotemplate.android.designsystem.DSSpacing

data class AppColors(
    val background: Int,
    val foreground: Int,
    val card: Int,
    val cardForeground: Int,
    val popover: Int,
    val popoverForeground: Int,
    val primary: Int,
    val primaryForeground: Int,
    val secondary: Int,
    val secondaryForeground: Int,
    val muted: Int,
    val mutedForeground: Int,
    val accent: Int,
    val accentForeground: Int,
    val destructive: Int,
    val border: Int,
    val input: Int,
    val ring: Int,
) {
    companion object {
        val light: AppColors = AppColors(
            background          = DSColorLight.background.hexToColorInt(),
            foreground          = DSColorLight.foreground.hexToColorInt(),
            card                = DSColorLight.card.hexToColorInt(),
            cardForeground      = DSColorLight.cardForeground.hexToColorInt(),
            popover             = DSColorLight.popover.hexToColorInt(),
            popoverForeground   = DSColorLight.popoverForeground.hexToColorInt(),
            primary             = DSColorLight.primary.hexToColorInt(),
            primaryForeground   = DSColorLight.primaryForeground.hexToColorInt(),
            secondary           = DSColorLight.secondary.hexToColorInt(),
            secondaryForeground = DSColorLight.secondaryForeground.hexToColorInt(),
            muted               = DSColorLight.muted.hexToColorInt(),
            mutedForeground     = DSColorLight.mutedForeground.hexToColorInt(),
            accent              = DSColorLight.accent.hexToColorInt(),
            accentForeground    = DSColorLight.accentForeground.hexToColorInt(),
            destructive         = DSColorLight.destructive.hexToColorInt(),
            border              = DSColorLight.border.hexToColorInt(),
            input               = DSColorLight.input.hexToColorInt(),
            ring                = DSColorLight.ring.hexToColorInt(),
        )

        val dark: AppColors = AppColors(
            background          = DSColorDark.background.hexToColorInt(),
            foreground          = DSColorDark.foreground.hexToColorInt(),
            card                = DSColorDark.card.hexToColorInt(),
            cardForeground      = DSColorDark.cardForeground.hexToColorInt(),
            popover             = DSColorDark.popover.hexToColorInt(),
            popoverForeground   = DSColorDark.popoverForeground.hexToColorInt(),
            primary             = DSColorDark.primary.hexToColorInt(),
            primaryForeground   = DSColorDark.primaryForeground.hexToColorInt(),
            secondary           = DSColorDark.secondary.hexToColorInt(),
            secondaryForeground = DSColorDark.secondaryForeground.hexToColorInt(),
            muted               = DSColorDark.muted.hexToColorInt(),
            mutedForeground     = DSColorDark.mutedForeground.hexToColorInt(),
            accent              = DSColorDark.accent.hexToColorInt(),
            accentForeground    = DSColorDark.accentForeground.hexToColorInt(),
            destructive         = DSColorDark.destructive.hexToColorInt(),
            border              = DSColorDark.border.hexToColorInt(),
            input               = DSColorDark.input.hexToColorInt(),
            ring                = DSColorDark.ring.hexToColorInt(),
        )
    }
}

object AppSpacing {
    const val xs:  Int = DSSpacing.s_2
    const val sm:  Int = DSSpacing.s_3
    const val md:  Int = DSSpacing.s_4
    const val lg:  Int = DSSpacing.s_6
    const val xl:  Int = DSSpacing.s_8
    const val xxl: Int = DSSpacing.s_10
}

object AppRadius {
    const val sm: Int = DSRadius.sm
    const val md: Int = DSRadius.md
    const val lg: Int = DSRadius.lg
    const val xl: Int = DSRadius.xl
}

object AppTypography {
    const val display: Int = DSFontSize.display
    const val heading: Int = DSFontSize.heading
    const val title:   Int = DSFontSize.title
    const val body:    Int = DSFontSize.body
    const val label:   Int = DSFontSize.label
    const val caption: Int = DSFontSize.caption
}

object AppMotion {
    const val fastMs: Int = DSDuration.fastMs
    const val baseMs: Int = DSDuration.baseMs
    const val slowMs: Int = DSDuration.slowMs
}
