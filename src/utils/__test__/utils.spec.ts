import {md5, s4, s8} from '../index'

describe('常用密码测试', () => {
    it('md5应当正常工作', () => {
        expect(md5('admin123456')).toBe('a66abb5684c45962d887564f08346e8d')
    });

    it('s4 生成 10000 次，重复率不超过 10%', () => {
        Array.from({length: 50}, () => 0).forEach(() => {
            const set = new Set()
            const count = 10000
            for (let i = 0; i < count; i++) {
                set.add(s4())
            }

            expect(set.size > 9000).toBeTruthy()
        })
    })


    it('s8 生成 15000 次，重复率不超过 7%', () => {
        Array.from({length: 50}, () => 0).forEach(() => {
            const set = new Set()
            const count = 150000
            for (let i = 0; i < count; i++) {
                set.add(s8())
            }
            expect(set.size > 140000).toBeTruthy()
        })
    })
});