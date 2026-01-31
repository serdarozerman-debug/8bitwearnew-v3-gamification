#!/usr/bin/env python3
"""
Pixel Art PNG to STL Converter for 3D Printing

Converts 64x64 pixel art PNG to STL file for TPU 3D printing.
Each opaque pixel becomes a 3D cube (voxel).
"""

import sys
import os
import json
import argparse
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
    from stl import mesh
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Missing dependency: {e}. Install: pip install Pillow numpy numpy-stl"
    }))
    sys.exit(1)


def create_cube_vertices(x_pos, y_pos, z_base, z_top, pixel_size):
    """Create 8 vertices for a cube at given position."""
    return [
        [x_pos, y_pos, z_base],                                    # 0: bottom-left-back
        [x_pos + pixel_size, y_pos, z_base],                      # 1: bottom-right-back
        [x_pos + pixel_size, y_pos + pixel_size, z_base],         # 2: bottom-right-front
        [x_pos, y_pos + pixel_size, z_base],                      # 3: bottom-left-front
        [x_pos, y_pos, z_top],                                    # 4: top-left-back
        [x_pos + pixel_size, y_pos, z_top],                      # 5: top-right-back
        [x_pos + pixel_size, y_pos + pixel_size, z_top],         # 6: top-right-front
        [x_pos, y_pos + pixel_size, z_top],                      # 7: top-left-front
    ]


def create_cube_faces(base_idx):
    """Create 12 triangular faces (2 per cube face) with given base vertex index."""
    return [
        # Bottom (z=0)
        [base_idx+0, base_idx+2, base_idx+1],
        [base_idx+0, base_idx+3, base_idx+2],
        # Top (z=extrusion_height)
        [base_idx+4, base_idx+5, base_idx+6],
        [base_idx+4, base_idx+6, base_idx+7],
        # Front (y=max)
        [base_idx+3, base_idx+7, base_idx+6],
        [base_idx+3, base_idx+6, base_idx+2],
        # Back (y=0)
        [base_idx+0, base_idx+1, base_idx+5],
        [base_idx+0, base_idx+5, base_idx+4],
        # Left (x=0)
        [base_idx+0, base_idx+4, base_idx+7],
        [base_idx+0, base_idx+7, base_idx+3],
        # Right (x=max)
        [base_idx+1, base_idx+2, base_idx+6],
        [base_idx+1, base_idx+6, base_idx+5],
    ]


def png_to_stl(png_path, stl_output_path, extrusion_height=2.0, base_thickness=1.0, pixel_size=1.5):
    """
    Convert pixel art PNG to STL file.
    
    Args:
        png_path: Input PNG file path
        stl_output_path: Output STL file path
        extrusion_height: Height of pixel cubes in mm
        base_thickness: Base plate thickness in mm
        pixel_size: Size of each pixel in mm
    
    Returns:
        dict: Statistics about the conversion
    """
    
    # 1. Load PNG
    try:
        img = Image.open(png_path).convert('RGBA')
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to load PNG: {e}"
        }
    
    width, height = img.size
    pixels = np.array(img)
    
    # 2. Build vertex/face lists for STL
    vertices = []
    faces = []
    opaque_pixel_count = 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[y, x]
            
            # Skip transparent pixels (alpha < 128 = transparent)
            if a < 128:
                continue
            
            opaque_pixel_count += 1
            
            # Calculate 3D position
            # X: left to right
            # Y: bottom to top (flip Y because PNG is top-down)
            # Z: extrusion height
            x_pos = x * pixel_size
            y_pos = (height - 1 - y) * pixel_size  # Flip Y axis
            z_base = 0
            z_top = extrusion_height
            
            # Create cube vertices
            cube_verts = create_cube_vertices(x_pos, y_pos, z_base, z_top, pixel_size)
            base_idx = len(vertices)
            vertices.extend(cube_verts)
            
            # Create cube faces
            cube_faces = create_cube_faces(base_idx)
            faces.extend(cube_faces)
    
    if opaque_pixel_count == 0:
        return {
            "success": False,
            "error": "No opaque pixels found in PNG"
        }
    
    # 3. Add base plate for stability
    base_verts = [
        [0, 0, -base_thickness],
        [width * pixel_size, 0, -base_thickness],
        [width * pixel_size, height * pixel_size, -base_thickness],
        [0, height * pixel_size, -base_thickness],
        [0, 0, 0],
        [width * pixel_size, 0, 0],
        [width * pixel_size, height * pixel_size, 0],
        [0, height * pixel_size, 0],
    ]
    
    base_idx = len(vertices)
    vertices.extend(base_verts)
    
    # Base plate faces (2 triangles per face, 6 faces)
    base_faces = [
        # Bottom
        [base_idx+0, base_idx+2, base_idx+1], [base_idx+0, base_idx+3, base_idx+2],
        # Top
        [base_idx+4, base_idx+5, base_idx+6], [base_idx+4, base_idx+6, base_idx+7],
        # Front
        [base_idx+3, base_idx+7, base_idx+6], [base_idx+3, base_idx+6, base_idx+2],
        # Back
        [base_idx+0, base_idx+1, base_idx+5], [base_idx+0, base_idx+5, base_idx+4],
        # Left
        [base_idx+0, base_idx+4, base_idx+7], [base_idx+0, base_idx+7, base_idx+3],
        # Right
        [base_idx+1, base_idx+2, base_idx+6], [base_idx+1, base_idx+6, base_idx+5],
    ]
    
    faces.extend(base_faces)
    
    # 4. Create STL mesh
    vertices = np.array(vertices, dtype=np.float32)
    faces = np.array(faces, dtype=np.int32)
    
    # Create mesh object
    stl_mesh = mesh.Mesh(np.zeros(len(faces), dtype=mesh.Mesh.dtype))
    for i, face in enumerate(faces):
        for j in range(3):
            stl_mesh.vectors[i][j] = vertices[face[j]]
    
    # 5. Save STL
    try:
        stl_mesh.save(stl_output_path)
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to save STL: {e}"
        }
    
    # 6. Calculate statistics
    file_size_bytes = os.path.getsize(stl_output_path)
    
    return {
        "success": True,
        "stats": {
            "width_mm": round(width * pixel_size, 2),
            "height_mm": round(height * pixel_size, 2),
            "depth_mm": round(extrusion_height + base_thickness, 2),
            "pixel_width": width,
            "pixel_height": height,
            "opaque_pixels": opaque_pixel_count,
            "total_triangles": len(faces),
            "file_size_kb": round(file_size_bytes / 1024, 2),
            "extrusion_height_mm": extrusion_height,
            "base_thickness_mm": base_thickness,
            "pixel_size_mm": pixel_size
        }
    }


def main():
    parser = argparse.ArgumentParser(
        description='Convert pixel art PNG to STL for 3D printing'
    )
    parser.add_argument('input_png', help='Input PNG file path')
    parser.add_argument('output_stl', help='Output STL file path')
    parser.add_argument('--extrusion', type=float, default=2.0, 
                       help='Extrusion height in mm (default: 2.0)')
    parser.add_argument('--base', type=float, default=1.0,
                       help='Base plate thickness in mm (default: 1.0)')
    parser.add_argument('--pixel-size', type=float, default=1.5,
                       help='Pixel size in mm (default: 1.5)')
    
    args = parser.parse_args()
    
    # Convert PNG to STL
    result = png_to_stl(
        args.input_png,
        args.output_stl,
        extrusion_height=args.extrusion,
        base_thickness=args.base,
        pixel_size=args.pixel_size
    )
    
    # Output JSON result
    print(json.dumps(result, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if result.get('success') else 1)


if __name__ == '__main__':
    main()
