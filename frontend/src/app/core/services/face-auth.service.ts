import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as faceapi from 'face-api.js';

@Injectable({ providedIn: 'root' })
export class FaceAuthService {
  private readonly baseUrl = 'http://localhost:8080/api/v1/auth';
  private modelsLoaded = false;

  constructor(private http: HttpClient) {}

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    const MODEL_URL = '/assets/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    this.modelsLoaded = true;
  }

  async getDescriptor(videoEl: HTMLVideoElement): Promise<number[] | null> {
    const detection = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return null;
    return Array.from(detection.descriptor);
  }

  registerFace(email: string, descriptor: number[]) {
    return this.http.post(`${this.baseUrl}/face/register`, { email, descriptor });
  }

  authenticateFace(email: string, descriptor: number[]) {
    return this.http.post<{ token: string }>(`${this.baseUrl}/face/authenticate`, {
      email,
      descriptor,
    });
  }
}
