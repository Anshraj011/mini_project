package com.vms.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private final Cloudinary cloudinary;

    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList("image/jpeg", "image/png", "image/jpg");
    private static final long MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    public String uploadFile(MultipartFile file) {
        validateFile(file);

        try {
            log.info("Uploading file to Cloudinary: {}", file.getOriginalFilename());
            Map uploadParams = ObjectUtils.asMap(
                "folder", "vms_visitors",
                "resource_type", "auto"
            );
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);
            return uploadResult.get("secure_url").toString();
        } catch (Exception e) {
            log.error("Cloudinary upload failed", e);
            throw new RuntimeException("Image upload failed: " + e.getMessage());
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size must not exceed 2MB");
        }
        
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Only JPG, JPEG, and PNG images are allowed");
        }
    }
}
