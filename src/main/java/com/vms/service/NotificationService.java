package com.vms.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import java.io.IOException;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final JavaMailSender mailSender;

    @Value("${sendgrid.api.key:}")
    private String sendGridApiKey;

    @Value("${spring.mail.properties.mail.smtp.from:}")
    private String fromEmail;

    @Async
    public void sendOtpEmail(String to, String otp) {
        log.info("Preparing to send OTP to: {} using SendGrid", to);
        
        String sender = (fromEmail != null && !fromEmail.isEmpty()) ? fromEmail : "anshkmrn@gmail.com";
        Email from = new Email(sender);
        String subject = "Your OTP Code";
        Email target = new Email(to);
        Content content = new Content("text/plain", "Your OTP is: " + otp);
        Mail mail = new Mail(from, subject, target, content);

        SendGrid sg = new SendGrid(sendGridApiKey);
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sg.api(request);
            
            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                log.info("OTP Email sent successfully via SendGrid to {}", to);
            } else {
                log.error("Failed to send OTP email via SendGrid to {}. Status Code: {}, Body: {}", 
                          to, response.getStatusCode(), response.getBody());
                log.info("FALLBACK - OTP for {}: {}", to, otp);
            }
        } catch (IOException ex) {
            log.error("CRITICAL: IOException while sending OTP email via SendGrid to {}", to, ex);
            log.info("FALLBACK - OTP for {}: {}", to, otp);
        } catch (Exception e) {
            log.error("CRITICAL: Unexpected error while sending OTP email via SendGrid to {}", to, e);
            log.info("FALLBACK - OTP for {}: {}", to, otp);
        }
    }

    @Async
    public void sendEmail(String to, String subject, String body) {
        log.info("Sending email to: {} using SendGrid", to);
        
        String sender = (fromEmail != null && !fromEmail.isEmpty()) ? fromEmail : "anshkmrn@gmail.com";
        Email from = new Email(sender);
        Email target = new Email(to);
        Content content = new Content("text/plain", body);
        Mail mail = new Mail(from, subject, target, content);

        SendGrid sg = new SendGrid(sendGridApiKey);
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sg.api(request);
            
            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                log.info("Email sent successfully via SendGrid to {}", to);
            } else {
                log.error("Failed to send email via SendGrid to {}. Status Code: {}, Body: {}", 
                          to, response.getStatusCode(), response.getBody());
            }
        } catch (IOException ex) {
            log.error("IOException while sending email via SendGrid to {}", to, ex);
        } catch (Exception e) {
            log.error("Unexpected error while sending email via SendGrid to {}", to, e);
        }
    }
}
