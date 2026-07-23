module.exports = {
	apps: [
		{
			name: 'bullish-marubozu-paper',
			script: 'dist/app.js',
			interpreter: 'node',
			autorestart: false,
			restart_delay: 1000,
		},
	],
};