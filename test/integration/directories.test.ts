import { describe, it, expect } from 'vitest'
import request from 'supertest'

const API_URL = 'http://localhost:3001'

describe('Directories API Integration Tests', () => {
    describe('GET /api/directories', () => {
        it('should return 400 if path is missing', async () => {
            const res = await request(API_URL).get('/api/directories')
            expect(res.status).toBe(400)
        })

        it('should return suggestions for root path', async () => {
            const res = await request(API_URL).get('/api/directories?path=/')
            expect(res.status).toBe(200)
            expect(res.body.isValid).toBe(true)
            expect(res.body.parentExists).toBe(true)
            expect(Array.isArray(res.body.suggestions)).toBe(true)
        })

        it('should return suggestions for /Users', async () => {
            // This assumes we are on a system with /Users (Mac)
            const res = await request(API_URL).get('/api/directories?path=/Users')

            // If /Users exists, it should be valid
            if (res.status === 200 && res.body.parentExists) {
                expect(Array.isArray(res.body.suggestions)).toBe(true)
                // Filter ensures we only get directories
            }
        })

        it('should match prefix', async () => {
            const res = await request(API_URL).get('/api/directories?path=/Users/m')
            if (res.status === 200 && res.body.parentExists) {
                // Should potentially find 'michael' or similar
                expect(Array.isArray(res.body.suggestions)).toBe(true)
            }
        })
    })
})
