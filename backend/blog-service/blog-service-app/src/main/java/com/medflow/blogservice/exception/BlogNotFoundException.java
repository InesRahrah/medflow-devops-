package com.medflow.blogservice.exception;

public class BlogNotFoundException extends RuntimeException {
    public BlogNotFoundException(Long id) {
        super("Blog not found with id: " + id);
    }
}