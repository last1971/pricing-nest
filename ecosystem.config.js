module.exports = {
    apps: [
        {
            name: 'pricing',
            script: 'dist/main.js',
            watch: true,
            env: {
                NO_COLOR: true,
            },
        },
    ],
};
