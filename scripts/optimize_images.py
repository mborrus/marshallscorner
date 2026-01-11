import os
from PIL import Image
import sys

# Configuration
IMAGE_DIR = 'public/images/writing'
MAX_WIDTH = 1600
QUALITY = 80

def optimize_image(filepath):
    try:
        with Image.open(filepath) as img:
            # Check if image needs resizing
            width, height = img.size
            if width > MAX_WIDTH:
                ratio = MAX_WIDTH / width
                new_height = int(height * ratio)
                img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
                print(f"Resized {os.path.basename(filepath)}: {width}x{height} -> {MAX_WIDTH}x{new_height}")
            
            # Save with optimization
            # We overwrite the original file
            # Handle different formats
            if img.format == 'JPEG' or filepath.lower().endswith(('.jpg', '.jpeg')):
                img.save(filepath, 'JPEG', quality=QUALITY, optimize=True)
            elif img.format == 'PNG' or filepath.lower().endswith('.png'):
                # PNG optimization is different, but we can still try to save optimized
                # Or convert to JPEG if transparency isn't needed? 
                # For now, let's keep format but optimize
                img.save(filepath, 'PNG', optimize=True)
            elif img.format == 'GIF':
                # Skip GIFs for now to avoid breaking animations
                return
            else:
                # Try saving as is with optimization
                img.save(filepath, quality=QUALITY, optimize=True)
                
            print(f"Optimized {os.path.basename(filepath)}")
            
    except Exception as e:
        print(f"Failed to optimize {filepath}: {e}")

def main():
    if not os.path.exists(IMAGE_DIR):
        print(f"Directory not found: {IMAGE_DIR}")
        return

    files = [f for f in os.listdir(IMAGE_DIR) if os.path.isfile(os.path.join(IMAGE_DIR, f))]
    total_files = len(files)
    
    print(f"Found {total_files} images in {IMAGE_DIR}")
    
    for i, filename in enumerate(files):
        filepath = os.path.join(IMAGE_DIR, filename)
        # Filter for image extensions
        if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            optimize_image(filepath)
            
    print("Optimization complete.")

if __name__ == "__main__":
    main()
