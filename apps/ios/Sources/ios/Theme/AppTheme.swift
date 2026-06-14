import SwiftUI

public struct AppColors {
    public let scheme: ColorScheme

    public init(scheme: ColorScheme) { self.scheme = scheme }

    private func pick(_ light: String, _ dark: String) -> Color {
        Color(hex: scheme == .dark ? dark : light)
    }

    public var background:          Color { pick(DSColorLight.background,          DSColorDark.background) }
    public var foreground:          Color { pick(DSColorLight.foreground,          DSColorDark.foreground) }
    public var card:                Color { pick(DSColorLight.card,                DSColorDark.card) }
    public var cardForeground:      Color { pick(DSColorLight.cardForeground,      DSColorDark.cardForeground) }
    public var popover:             Color { pick(DSColorLight.popover,             DSColorDark.popover) }
    public var popoverForeground:   Color { pick(DSColorLight.popoverForeground,   DSColorDark.popoverForeground) }
    public var primary:             Color { pick(DSColorLight.primary,             DSColorDark.primary) }
    public var primaryForeground:   Color { pick(DSColorLight.primaryForeground,   DSColorDark.primaryForeground) }
    public var secondary:           Color { pick(DSColorLight.secondary,           DSColorDark.secondary) }
    public var secondaryForeground: Color { pick(DSColorLight.secondaryForeground, DSColorDark.secondaryForeground) }
    public var muted:               Color { pick(DSColorLight.muted,               DSColorDark.muted) }
    public var mutedForeground:     Color { pick(DSColorLight.mutedForeground,     DSColorDark.mutedForeground) }
    public var accent:              Color { pick(DSColorLight.accent,              DSColorDark.accent) }
    public var accentForeground:    Color { pick(DSColorLight.accentForeground,    DSColorDark.accentForeground) }
    public var destructive:         Color { pick(DSColorLight.destructive,         DSColorDark.destructive) }
    public var border:              Color { pick(DSColorLight.border,              DSColorDark.border) }
    public var input:               Color { pick(DSColorLight.input,               DSColorDark.input) }
    public var ring:                Color { pick(DSColorLight.ring,                DSColorDark.ring) }
}

public extension EnvironmentValues {
    var appColors: AppColors { AppColors(scheme: colorScheme) }
}

public enum AppSpacing {
    public static let xs:  CGFloat = DSSpacing.s_2
    public static let sm:  CGFloat = DSSpacing.s_3
    public static let md:  CGFloat = DSSpacing.s_4
    public static let lg:  CGFloat = DSSpacing.s_6
    public static let xl:  CGFloat = DSSpacing.s_8
    public static let xxl: CGFloat = DSSpacing.s_10
}

public enum AppRadius {
    public static let sm:  CGFloat = DSRadius.sm
    public static let md:  CGFloat = DSRadius.md
    public static let lg:  CGFloat = DSRadius.lg
    public static let xl:  CGFloat = DSRadius.xl
}

public enum AppTypography {
    public static let display: Font = .system(size: DSFontSize.display, weight: .bold)
    public static let heading: Font = .system(size: DSFontSize.heading, weight: .semibold)
    public static let title:   Font = .system(size: DSFontSize.title,   weight: .semibold)
    public static let body:    Font = .system(size: DSFontSize.body,    weight: .regular)
    public static let label:   Font = .system(size: DSFontSize.label,   weight: .medium)
    public static let caption: Font = .system(size: DSFontSize.caption, weight: .regular)
}

public enum AppMotion {
    public static let fast: Animation = .easeInOut(duration: DSDuration.fast)
    public static let base: Animation = .easeInOut(duration: DSDuration.base)
    public static let slow: Animation = .easeInOut(duration: DSDuration.slow)
    public static let emphasizedBase: Animation = .timingCurve(0.2, 0, 0, 1, duration: DSDuration.base)
}
