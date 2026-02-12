
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Ramadan Night Sky palette
				navy: {
					DEFAULT: '#0C1445',
					50: '#E8EAF6',
					100: '#C5CAE9',
					200: '#9FA8DA',
					300: '#7986CB',
					400: '#5C6BC0',
					500: '#3F51B5',
					600: '#303F9F',
					700: '#1A237E',
					800: '#0C1445',
					900: '#060A22'
				},
				gold: {
					DEFAULT: '#F9A825',
					50: '#FFFDE7',
					100: '#FFF9C4',
					200: '#FFF59D',
					300: '#FFD54F',
					400: '#F9A825',
					500: '#F57F17',
					600: '#FF8F00',
					700: '#E65100',
					800: '#BF360C',
					900: '#3D390C'
				},
				purple: {
					DEFAULT: '#311B92',
					50: '#EDE7F6',
					100: '#D1C4E9',
					200: '#B39DDB',
					300: '#9575CD',
					400: '#7E57C2',
					500: '#673AB7',
					600: '#5E35B1',
					700: '#512DA8',
					800: '#4527A0',
					900: '#311B92'
				},
				emerald: {
					DEFAULT: '#00897B',
					50: '#E0F2F1',
					100: '#B2DFDB',
					200: '#80CBC4',
					300: '#4DB6AC',
					400: '#26A69A',
					500: '#009688',
					600: '#00897B',
					700: '#00796B',
					800: '#00695C',
					900: '#004D40'
				},
				// Keep umma for backward compatibility
				umma: {
					DEFAULT: '#F9A825',
					50: '#FFFDE7',
					100: '#FFF9C4',
					200: '#FFD54F',
					300: '#F9A825',
					400: '#F9A825',
					500: '#F57F17',
					600: '#FF8F00',
					700: '#E65100',
					800: '#BF360C',
					900: '#3D390C'
				}
			},
			spacing: {
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'card-press': {
					'0%, 100%': {
						transform: 'scale(1)'
					},
					'50%': {
						transform: 'scale(0.97)'
					}
				},
				'fade-in': {
					from: {
						opacity: '0'
					},
					to: {
						opacity: '1'
					}
				},
				'slide-up': {
					from: {
						opacity: '0',
						transform: 'translateY(8px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'pulse-soft': {
					'0%, 100%': {
						opacity: '1'
					},
					'50%': {
						opacity: '0.7'
					}
				},
				'golden-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 15px rgba(249, 168, 37, 0.1)'
					},
					'50%': {
						boxShadow: '0 0 25px rgba(249, 168, 37, 0.25)'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-6px)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'card-press': 'card-press 0.15s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
				'golden-pulse': 'golden-pulse 3s ease-in-out infinite',
				'float': 'float 4s ease-in-out infinite'
			},
			backgroundImage: {
				'night-sky': 'linear-gradient(135deg, #0C1445 0%, #1A237E 40%, #311B92 100%)',
				'golden-glow': 'linear-gradient(135deg, #F9A825 0%, #FF8F00 100%)',
				'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
