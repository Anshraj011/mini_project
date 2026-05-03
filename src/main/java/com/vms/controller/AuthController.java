package com.vms.controller;

import com.vms.dto.AuthResponse;
import com.vms.dto.LoginRequest;
import com.vms.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import com.vms.model.User;
import com.vms.repository.UserRepository;
import com.vms.security.RateLimitingService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final RateLimitingService rateLimitingService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        if (!rateLimitingService.resolveBucket(request.getRemoteAddr()).tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body("Too many requests. Please try again later.");
        }
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );
            
            UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.getUsername());
            String jwt = jwtUtil.generateToken(userDetails);
            
            User user = userRepository.findByUsername(loginRequest.getUsername()).orElseThrow();
            AuthResponse authResponse = new AuthResponse();
            authResponse.setToken(jwt);
            authResponse.setRole(user.getRole().name());
            authResponse.setName(user.getName() != null ? user.getName() : user.getUsername());
            authResponse.setUsername(user.getUsername());
            
            log.info("User logged in successfully: {}", loginRequest.getUsername());
            return ResponseEntity.ok(authResponse);
        } catch (BadCredentialsException e) {
            log.warn("Failed login attempt for username: {}", loginRequest.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        } catch (Exception e) {
            log.error("Error during login for user: {}", loginRequest.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred during login");
        }
    }
}
