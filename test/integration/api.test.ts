import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'

const API_URL = 'http://localhost:3001'

describe('REST API Integration Tests', () => {

    // We assume the server is running on localhost:3001
    // In a real CI environment, we would spawn it here.

    // Helper to cleanup
    const cleanup = async () => {
        const res = await request(API_URL).get('/api/tasks')
        if (res.body && Array.isArray(res.body)) {
            for (const task of res.body) {
                await request(API_URL).delete(`/api/tasks/${task.id}`)
            }
        }
    }

    beforeAll(async () => {
        // Wait for server to be ready (optional, or manual start)
        // clean up existing tasks
        await cleanup()
    })

    afterAll(async () => {
        await cleanup()
    })

    describe('GET /api/tasks', () => {
        it('should return empty array initially', async () => {
            const res = await request(API_URL).get('/api/tasks')
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
            expect(res.body).toEqual([])
        })

        it('should return created tasks', async () => {
            await request(API_URL).post('/api/tasks').send({ title: 'Task 1' })
            await request(API_URL).post('/api/tasks').send({ title: 'Task 2' })

            const res = await request(API_URL).get('/api/tasks')
            expect(res.status).toBe(200)
            expect(res.body).toHaveLength(2)
        })
    })

    describe('POST /api/tasks', () => {
        beforeEach(async () => await cleanup())

        it('should create a new task', async () => {
            const res = await request(API_URL)
                .post('/api/tasks')
                .send({ title: 'New Task', description: 'Test description' })

            expect(res.status).toBe(201)
            expect(res.body.title).toBe('New Task')
            expect(res.body.description).toBe('Test description')
            expect(res.body.status).toBe('todo')
            expect(res.body.id).toBeDefined()
        })

        it('should create task with working directory', async () => {
            const res = await request(API_URL)
                .post('/api/tasks')
                .send({
                    title: 'New Task',
                    workingDirectory: '/home/user/project'
                })

            expect(res.status).toBe(201)
            expect(res.body.workingDirectory).toBe('/home/user/project')
        })

        it('should return 400 when title is missing', async () => {
            const res = await request(API_URL)
                .post('/api/tasks')
                .send({ description: 'No title' })

            // Express returns 422 for missing fields
            expect(res.status).toBe(422)
            // expect(res.body.error).toBe('Title is required')
        })
    })

    describe('PUT /api/tasks/:id', () => {
        let taskId: string

        beforeEach(async () => {
            await cleanup()
            const res = await request(API_URL).post('/api/tasks').send({ title: 'Original' })
            taskId = res.body.id
        })

        it('should update an existing task', async () => {
            const res = await request(API_URL)
                .put(`/api/tasks/${taskId}`)
                .send({ title: 'Updated Title', status: 'inProgress' }) // "inProgress" for camelCase

            expect(res.status).toBe(200)
            expect(res.body.title).toBe('Updated Title')
            // expect(res.body.status).toBe('inProgress') 
        })

        it('should return 404 for non-existent task', async () => {
            const res = await request(API_URL)
                .put('/api/tasks/nonexistent-id')
                .send({ title: 'Updated' })

            expect(res.status).toBe(404)
        })
    })

    describe('DELETE /api/tasks/:id', () => {
        let taskId: string

        beforeEach(async () => {
            await cleanup()
            const res = await request(API_URL).post('/api/tasks').send({ title: 'To Delete' })
            taskId = res.body.id
        })

        it('should delete an existing task', async () => {
            const res = await request(API_URL).delete(`/api/tasks/${taskId}`)
            expect(res.status).toBe(204)

            const list = await request(API_URL).get('/api/tasks')
            expect(list.body).toHaveLength(0)
        })
    })
})
