import csv
import os
import subprocess
import re
import urllib.request
import urllib.parse
import json
from datetime import datetime

# Configuration
SOURCE_DIR = 'content/raw_import'
POSTS_CSV = os.path.join(SOURCE_DIR, 'posts.csv')
POSTS_DIR = os.path.join(SOURCE_DIR, 'posts')
DEST_POSTS_DIR = 'content/writing/posts'
DEST_ASSETS_DIR = 'public/images/writing'

# Ensure destination directories exist
os.makedirs(DEST_POSTS_DIR, exist_ok=True)
os.makedirs(DEST_ASSETS_DIR, exist_ok=True)

def download_image(url):
    try:
        if not url:
            return None
            
        # Extract filename from URL or generate one
        parsed_url = urllib.parse.urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename or '.' not in filename:
            filename = f"image_{hash(url)}.jpg"
        
        # Clean filename
        filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
        
        # Handle potential duplicates or very long names
        if len(filename) > 50:
             filename = filename[-50:]
             
        dest_path = os.path.join(DEST_ASSETS_DIR, filename)
        
        # Check if file already exists to avoid re-downloading
        if os.path.exists(dest_path):
            return filename

        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
            
        return filename
    except Exception as e:
        print(f"Failed to download image {url}: {e}")
        return None

def preprocess_html(html_content):
    # Remove native-video-embed
    html_content = re.sub(r'<div class="native-video-embed".*?</div>', '', html_content, flags=re.DOTALL)

    # Convert Spotify iframes to links
    def replace_spotify(match):
        src = match.group(1)
        return f'<p><a href="{src}">Listen on Spotify</a></p>'
    
    html_content = re.sub(r'<iframe\s+[^>]*src="([^"]*spotify[^"]*)"[^>]*>.*?</iframe>', replace_spotify, html_content, flags=re.DOTALL)

    # Simplify Substack images
    # Look for <div class="captioned-image-container"> ... <img src="..."> ... <figcaption>...</figcaption> ... </div>
    
    # Regex to find the image container and extract src and caption
    # We'll replace it with a simple <img src="..." alt="..."> which pandoc handles well
    
    def replace_image_container(match):
        content = match.group(0)
        
        # Extract Image URL
        # Look for the main image, usually in <img src="...">
        # Substack often has multiple imgs, we want the one in image2-inset or just the first one
        img_match = re.search(r'<img\s+[^>]*src="([^"]+)"', content)
        if not img_match:
            return content # Could not find image, leave as is
            
        src = img_match.group(1)
        
        # Extract Caption
        caption_match = re.search(r'<figcaption>(.*?)</figcaption>', content, re.DOTALL)
        caption = ""
        if caption_match:
            # Remove HTML tags from caption
            caption = re.sub(r'<[^>]+>', '', caption_match.group(1)).strip()
            
        return f'<img src="{src}" alt="{caption}" />'

    # Pattern for the container
    # We use a loose pattern to catch the div wrapper
    pattern = r'<div class="captioned-image-container">.*?</div>'
    # This regex is risky if nested divs, but Substack structure is usually flat for these containers.
    # However, regex for HTML is generally bad.
    # Let's try to target the specific structure we saw.
    
    # Better approach: Just find the <figure>...</figure> inside the div?
    # Or maybe just regex replace the whole file looking for the pattern.
    
    # Let's try a non-greedy match for the div
    html_content = re.sub(r'<div class="captioned-image-container">.*?</div>', replace_image_container, html_content, flags=re.DOTALL)
    
    return html_content

def convert_post(row):
    post_id = row['post_id']
    title = row['title']
    subtitle = row['subtitle']
    date_str = row['post_date']
    is_published = row['is_published']
    
    if is_published.lower() != 'true':
        print(f"Skipping unpublished post: {title}")
        return

    # Parse date
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
        date_formatted = dt.strftime("%Y-%m-%d")
    except ValueError:
        try:
             dt = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
             date_formatted = dt.strftime("%Y-%m-%d")
        except:
            print(f"Could not parse date {date_str} for {title}")
            return

    html_filename = f"{post_id}.html"
    html_path = os.path.join(POSTS_DIR, html_filename)
    
    if not os.path.exists(html_path):
        print(f"HTML file not found: {html_path}")
        return

    parts = post_id.split('.', 1)
    slug = parts[1] if len(parts) == 2 else post_id
    dest_filename = f"{date_formatted}-{slug}.md"
    dest_path = os.path.join(DEST_POSTS_DIR, dest_filename)

    print(f"Converting {title} -> {dest_filename}")

    # Read HTML
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Preprocess HTML to simplify images
    html_content = preprocess_html(html_content)
    
    # Write temporary preprocessed HTML
    temp_html_path = html_path + ".temp"
    with open(temp_html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    # Convert HTML to Markdown
    try:
        result = subprocess.run(
            ['pandoc', temp_html_path, '-f', 'html', '-t', 'markdown', '--wrap=none'],
            capture_output=True, text=True, check=True
        )
        markdown_content = result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Pandoc failed for {html_path}: {e}")
        if os.path.exists(temp_html_path):
            os.remove(temp_html_path)
        return

    # Clean up temp file
    if os.path.exists(temp_html_path):
        os.remove(temp_html_path)

    # Process Images in Markdown (now they should be standard ![])
    def replace_image(match):
        alt = match.group(1)
        url = match.group(2)
        
        local_filename = download_image(url)
        if local_filename:
            return f"![{alt}](/images/writing/{local_filename})"
        else:
            return match.group(0)

    markdown_content = re.sub(r'!\[(.*?)\]\((.*?)\)', replace_image, markdown_content)
    
    # Handle Galleries (if any remain as raw HTML or pandoc divs)
    # Substack galleries might be complex. For now, we focus on main images.
    # If we see ::: image-gallery-embed, we might want to try to extract images from the attrs json.
    
    def process_gallery(match):
        attrs_content = match.group(1)
        images = []
        
        # Regex to find src inside the attrs string
        # Look for "src":"URL" or src="URL" (escaped)
        # The JSON usually has "src":"https://..."
        
        # We use a simple regex to find all https urls that look like images
        # This is a heuristic but should work for the gallery blob
        
        # Unescape common entities just in case
        attrs_content = attrs_content.replace('&quot;', '"').replace('\\"', '"')
        
        urls = re.findall(r'"src":"(https://[^"]+)"', attrs_content)
        
        for url in urls:
            # Filter for actual images if needed
            if 'substack-post-media' in url or 'image' in url:
                local_filename = download_image(url)
                if local_filename:
                    images.append(f"![](/images/writing/{local_filename})")
        
        if images:
            return "\n" + "\n\n".join(images) + "\n"
        else:
            return ""

    # Regex for gallery div
    # ::: {.image-gallery-embed ... attrs="{...}"}
    markdown_content = re.sub(r'::: \{.image-gallery-embed.*?attrs="(.*?)".*?\}\s*:::', process_gallery, markdown_content, flags=re.DOTALL)


    # Create Frontmatter
    frontmatter = f"""---
title: "{title.replace('"', '\\"')}"
date: "{date_formatted}"
slug: "{slug}"
excerpt: "{subtitle.replace('"', '\\"')}"
draft: false
source:
  substack_url: "{row.get('podcast_url', '')}" 
---

"""

    with open(dest_path, 'w') as f:
        f.write(frontmatter + markdown_content)

def main():
    if not os.path.exists(POSTS_CSV):
        print(f"CSV file not found: {POSTS_CSV}")
        return

    with open(POSTS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            convert_post(row)

if __name__ == "__main__":
    main()
