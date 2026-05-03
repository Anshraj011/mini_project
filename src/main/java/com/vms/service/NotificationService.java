package com.vms.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import org.springframework.scheduling.annotation.Async;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final JavaMailSender mailSender;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.properties.mail.smtp.from:}")
    private String fromEmail;

    @Async
    public void sendOtpEmail(String to, String otp) {
        log.info("Preparing to send OTP to: {}", to);
        String subject = "Your VMS Login OTP";
        String body = "Hello,\n\nYour One-Time Password (OTP) for VMS login is: " + otp + 
                      "\n\nThis OTP is valid for 5 minutes. If you did not request this, please ignore this email.";
        
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (fromEmail != null && !fromEmail.isEmpty()) message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("OTP Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("CRITICAL: Failed to send OTP email to {}", to);
            log.error("Exception details:", e);
            System.out.println("FALLBACK - OTP for " + to + ": " + otp);
            e.printStackTrace();
        }
    }

    @Async
    public void sendEmail(String to, String subject, String body) {
        log.info("Sending email to: {}", to);
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (fromEmail != null && !fromEmail.isEmpty()) message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}", to, e);
            e.printStackTrace();
        }
    }
}
