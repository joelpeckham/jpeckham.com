<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Static Files Directory</title>
</head>
<body>
    <h1>Static Files Directory</h1>
    <!-- Grid of files in the current directory with icons -->
    <div class="grid">
        <?php foreach ($files as $file): ?>
            <?php if (is_dir($file)): ?>
                <div class="grid-item">
                    <a href="<?php echo $file; ?>">
                        <img src="<?php echo $file; ?>/icon.png" alt="<?php echo $file; ?>">
                    </a>
                </div>
            <?php else: ?>
                <div class="grid-item">
                    <a href="<?php echo $file; ?>">
                        <img src="<?php echo $file; ?>" alt="<?php echo $file; ?>">
                    </a>
                </div>
            <?php endif; ?>
        <?php endforeach; ?>
</body>
</html>