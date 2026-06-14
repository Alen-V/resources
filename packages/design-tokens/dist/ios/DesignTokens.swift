// GENERATED FILE. Do not edit. Source: packages/design-tokens/src/

import Foundation
import CoreGraphics

public enum DSColorLight {
    public static let background = "#F6F3ED"
    public static let foreground = "#121212"
    public static let card = "#FBFAF8"
    public static let cardForeground = "#121212"
    public static let popover = "#FBFAF8"
    public static let popoverForeground = "#121212"
    public static let primary = "#1B1A1A"
    public static let primaryForeground = "#FBFAF8"
    public static let secondary = "#EFE9DC"
    public static let secondaryForeground = "#1B1A1A"
    public static let muted = "#EFE9DC"
    public static let mutedForeground = "#50504E"
    public static let accent = "#BCA575"
    public static let accentForeground = "#121212"
    public static let destructive = "#E7000B"
    public static let border = "#E3DAC6"
    public static let input = "#E3DAC6"
    public static let ring = "#747371"
}

public enum DSColorDark {
    public static let background = "#121212"
    public static let foreground = "#F6F3ED"
    public static let card = "#151514"
    public static let cardForeground = "#F6F3ED"
    public static let popover = "#151514"
    public static let popoverForeground = "#F6F3ED"
    public static let primary = "#BCA575"
    public static let primaryForeground = "#121212"
    public static let secondary = "#1B1A1A"
    public static let secondaryForeground = "#F6F3ED"
    public static let muted = "#1B1A1A"
    public static let mutedForeground = "#E3DAC6"
    public static let accent = "#747371"
    public static let accentForeground = "#FBFAF8"
    public static let destructive = "#FF6467"
    public static let border = "#FBFAF81A"
    public static let input = "#FBFAF826"
    public static let ring = "#BCA575"
}

public enum DSSpacing {
    public static let s_0: CGFloat = 0
    public static let s_1: CGFloat = 4
    public static let s_2: CGFloat = 8
    public static let s_3: CGFloat = 12
    public static let s_4: CGFloat = 16
    public static let s_5: CGFloat = 20
    public static let s_6: CGFloat = 24
    public static let s_8: CGFloat = 32
    public static let s_10: CGFloat = 40
    public static let s_12: CGFloat = 48
    public static let s_16: CGFloat = 64
    public static let s_20: CGFloat = 80
    public static let s_24: CGFloat = 96
}

public enum DSRadius {
    public static let base: CGFloat = 10
    public static let sm: CGFloat = 6
    public static let md: CGFloat = 8
    public static let lg: CGFloat = 10
    public static let xl: CGFloat = 14
    public static let xl2: CGFloat = 18
    public static let xl3: CGFloat = 22
    public static let xl4: CGFloat = 26
}

public enum DSFontSize {
    public static let display: CGFloat = 32
    public static let heading: CGFloat = 24
    public static let title: CGFloat = 20
    public static let body: CGFloat = 16
    public static let label: CGFloat = 14
    public static let caption: CGFloat = 12
}

public enum DSLineHeight {
    public static let display: CGFloat = 40
    public static let heading: CGFloat = 32
    public static let title: CGFloat = 28
    public static let body: CGFloat = 24
    public static let label: CGFloat = 20
    public static let caption: CGFloat = 16
}

public enum DSFontWeight {
    public static let display: CGFloat = 700
    public static let heading: CGFloat = 600
    public static let title: CGFloat = 600
    public static let body: CGFloat = 400
    public static let label: CGFloat = 500
    public static let caption: CGFloat = 400
}

public enum DSOpacity {
    public static let subtle: Double = 0.1
    public static let soft: Double = 0.3
    public static let medium: Double = 0.5
    public static let strong: Double = 0.8
}

public enum DSBorderWidth {
    public static let hairline: CGFloat = 1
    public static let thin: CGFloat = 1
    public static let emphasis: CGFloat = 2
    public static let focus: CGFloat = 3
}

public enum DSDuration {
    public static let fast: Double = 0.150
    public static let base: Double = 0.200
    public static let slow: Double = 0.300
}

public struct DSShadowSpec: Sendable {
    public let offsetX: CGFloat
    public let offsetY: CGFloat
    public let blur: CGFloat
    public let spread: CGFloat
    public let color: String
    public let alpha: Double
}

public enum DSShadow {
    public static let sm = DSShadowSpec(offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: "#000000", alpha: 0.05)
    public static let md = DSShadowSpec(offsetX: 0, offsetY: 4, blur: 6, spread: 0, color: "#000000", alpha: 0.1)
    public static let lg = DSShadowSpec(offsetX: 0, offsetY: 10, blur: 15, spread: 0, color: "#000000", alpha: 0.1)
    public static let xl = DSShadowSpec(offsetX: 0, offsetY: 20, blur: 25, spread: 0, color: "#000000", alpha: 0.1)
}

public struct DSButtonSize: Sendable {
    public let height: CGFloat
    public let width: CGFloat?
    public let paddingX: CGFloat?
    public let fontSize: CGFloat?
}

public enum DSButton {
    public static let radius: CGFloat = 8
    public static let iconGap: CGFloat = 8
    public static let focusRingWidth: CGFloat = 3
    public static let sizeDefault = DSButtonSize(height: 36, width: nil, paddingX: 16, fontSize: 14)
    public static let sizeXs = DSButtonSize(height: 28, width: nil, paddingX: 12, fontSize: 12)
    public static let sizeSm = DSButtonSize(height: 32, width: nil, paddingX: 12, fontSize: 14)
    public static let sizeLg = DSButtonSize(height: 40, width: nil, paddingX: 24, fontSize: 16)
    public static let sizeIcon = DSButtonSize(height: 36, width: 36, paddingX: nil, fontSize: nil)
    public static let sizeIconXs = DSButtonSize(height: 28, width: 28, paddingX: nil, fontSize: nil)
    public static let sizeIconSm = DSButtonSize(height: 32, width: 32, paddingX: nil, fontSize: nil)
    public static let sizeIconLg = DSButtonSize(height: 40, width: 40, paddingX: nil, fontSize: nil)
}

public enum DSInput {
    public static let radius: CGFloat = 8
    public static let height: CGFloat = 36
    public static let paddingX: CGFloat = 12
    public static let fontSize: CGFloat = 14
    public static let borderWidth: CGFloat = 1
}
